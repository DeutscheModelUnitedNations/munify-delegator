import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, StandardFonts, type PDFPage } from 'pdf-lib';
import { createCodeSigner } from '#api/handlers/signedCode/codeSigner';
import { drawQr } from '#lib/api/pdfQr';
import {
	DOCUMENT_ELEMENTS,
	POINTS_PER_MM,
	resolveDocumentLayout,
	type DocumentLayout,
	squareInPoints
} from '#lib/helpers/documentLayout';
import { fitQrSquare, minQrSide, qrMatrix } from '#lib/helpers/qrSize';
import { planDetails, type AgreementField } from '#lib/paperScan/agreementDetails';
import { areasAsPrinted, encodeAreas, type PageAreas, type PaperArea } from '#lib/paperScan/areas';
import { drawPaperPage } from '#lib/paperScan/drawPaper';
import { PAPER_FIELDS, type PaperField } from '#lib/paperScan/fields';
import { pageAreas, POSTAL_DOCUMENTS, type PostalDocument } from '#lib/paperScan/pageAreas';
import { printedInkOf } from '#lib/paperScan/printedInk';
import type { FieldReading, FieldState } from '#lib/paperScan/readPaper';
import { renderPdfPage, simulateScan, type Pixels } from '#lib/paperScan/scanSimulation';
import { signedCodeLink } from '#lib/signedCode/signedCode';
import type * as schema from '../schema';
import type { DevAccountSub } from '../seed-data/devAccounts';
import { applicationTemplate } from '../seed-data/pdfDocuments';
import type { ConferenceSeed } from './context';
import { addSeedFile } from './files';

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a persona sent in, and how it was read. */
export interface PaperPlan {
	source: (typeof schema.postalScan.$inferInsert)['source'];
	/** A minor's documents have the guardians' consent, and the guardians sign the media consent. */
	minor?: boolean;
	/** Fields read as something else than filled in. */
	read?: Partial<Record<AgreementField, 'no' | 'unclear'>>;
	/** Details a person set by hand afterwards. */
	manual?: Partial<Record<AgreementField, FieldState>>;
	/** Pages (`document:page`) whose fields could not be read, scanned as a picture. */
	unreadable?: readonly string[];
	/** A page without a code was uploaded on their card as well. */
	extraPage?: boolean;
}

type PaperPlans = Partial<Record<DevAccountSub, PaperPlan>>;

/**
 * The paper of the preparing conference: every way a scan comes in, and what keeps a document from
 * being done. `dev-head-delegate` has sent nothing. Must agree with `personaStatuses`.
 */
const preparationPaper: PaperPlans = {
	// contract not signed; photos in part, with one box nobody could tell until a person looked
	'dev-delegate': {
		source: 'WEBDAV',
		read: {
			termsSignature: 'no',
			mediaByOthers: 'no',
			mediaSocial: 'no',
			mediaAdvertising: 'unclear'
		},
		manual: { mediaAdvertising: 'no' }
	},
	// whether the second guardian signed is unclear, which a person has to decide
	'dev-delegate-minor': {
		source: 'WEBDAV',
		minor: true,
		read: { guardian2Signature: 'unclear' }
	},
	'dev-nsa-delegate': { source: 'WEBDAV' },
	// the media consent's signed page came as a blurred photo
	'dev-single': { source: 'FOLDER', unreadable: ['mediaConsent:2'], extraPage: true }
};

/** The paper once the conference runs: everything in, all or some or no photos allowed. */
const conferencePaper: PaperPlans = {
	'dev-head-delegate': { source: 'UPLOAD' },
	'dev-delegate': { source: 'WEBDAV', read: { mediaByOthers: 'no', mediaSocial: 'no' } },
	'dev-delegate-minor': {
		source: 'WEBDAV',
		minor: true,
		read: {
			mediaPhoto: 'no',
			mediaVideo: 'no',
			mediaByDmun: 'no',
			mediaByOthers: 'no',
			mediaInternal: 'no',
			mediaDocumentation: 'no',
			mediaPapers: 'no',
			mediaPress: 'no',
			mediaWebsite: 'no',
			mediaSocial: 'no',
			mediaSearch: 'no',
			mediaAdvertising: 'no'
		}
	},
	'dev-nsa-delegate': { source: 'WEBDAV' },
	'dev-single': { source: 'FOLDER' }
};

/** Whose paper was scanned in a conference of this state, in a typed order to walk them in. */
export function paperPlans(state: ConferenceSeed['plan']['conference']['state']) {
	const plans = state === 'PREPARATION' ? preparationPaper : conferencePaper;
	const holders: DevAccountSub[] = [
		'dev-head-delegate',
		'dev-delegate',
		'dev-delegate-minor',
		'dev-nsa-delegate',
		'dev-single'
	];
	return holders.flatMap((userId) => {
		const plan = plans[userId];
		return plan ? [{ userId, plan }] : [];
	});
}

/** A field of a persona's page as it was read; a guardian's is empty on an adult's page. */
function readingOf({ field, plan }: { field: PaperField; plan: PaperPlan }): FieldReading {
	const differing: Partial<Record<PaperField, FieldState>> = plan.read ?? {};
	const empty = !plan.minor && /guardian/i.test(field);
	return { field, state: differing[field] ?? (empty ? 'no' : 'yes') };
}

/** A postal document's layout: each places the footer's code and the fields. */
type PostalLayout = DocumentLayout<PostalDocument>;

/**
 * A page of a persona's documents, where its marks and fields are, and what was read off it
 * (`null`: nothing).
 */
interface ScannedPage {
	document: PostalDocument;
	page: number;
	layout: PostalLayout;
	placed: PageAreas;
	areas: PaperArea[];
	readings: FieldReading[] | null;
}

/** The pages of the documents a persona has, as the form has them. */
export async function paperPages({ plan, layouts }: { plan: PaperPlan; layouts: unknown }) {
	const pages: ScannedPage[] = [];
	for (const document of POSTAL_DOCUMENTS) {
		if (document === 'guardianConsent' && !plan.minor) continue;
		const template = await PDFDocument.load(applicationTemplate(document));
		for (const [page, sheet] of template.getPages().entries()) {
			const { width, height } = sheet.getSize();
			const layout = resolveDocumentLayout({ document, stored: layouts });
			const placed = pageAreas({ document, layout, page, size: { width, height } });
			const { areas } = placed;
			const unreadable = plan.unreadable?.includes(`${document}:${page}`) ?? false;
			const readings = unreadable ? null : areas.map(({ field }) => readingOf({ field, plan }));
			pages.push({ document, page, layout, placed, areas, readings });
		}
	}
	return pages;
}

/** The details the app makes of a persona's pages, with those set by hand. */
export function paperDetails({ plan, pages }: { plan: PaperPlan; pages: readonly ScannedPage[] }) {
	const manual: Partial<Record<AgreementField, FieldState>> = plan.manual ?? {};
	const readings = pages.flatMap((page) => page.readings ?? []);
	return planDetails({ readings, stored: [], confirm: false }).write.map(({ field, state }) => {
		const set = manual[field];
		return set === undefined
			? { field, state, source: 'SCAN' as const }
			: { field, state: set, source: 'MANUAL' as const };
	});
}

/** Fills a field in by pen: a cross, a scribble, or a faint stroke nobody can tell. */
function fillIn({ page, area, state }: { page: PDFPage; area: PaperArea; state: FieldState }) {
	if (state === 'no') return;
	const at = ({ x, y }: { x: number; y: number }) => ({
		x: (area.x + x * area.width) * POINTS_PER_MM,
		y: page.getHeight() - (area.y + y * area.height) * POINTS_PER_MM
	});
	const stroke = ({ from, to }: Record<'from' | 'to', { x: number; y: number }>) =>
		page.drawLine({ start: at(from), end: at(to), thickness: state === 'yes' ? 1.2 : 0.4 });
	stroke({ from: { x: 0.2, y: 0.8 }, to: { x: 0.5, y: 0.2 } });
	if (state !== 'yes') return;
	stroke({ from: { x: 0.5, y: 0.2 }, to: { x: 0.8, y: 0.8 } });
	if (PAPER_FIELDS[area.field].mark === 'checkbox') {
		stroke({ from: { x: 0.2, y: 0.2 }, to: { x: 0.8, y: 0.8 } });
	}
}

/**
 * Signs the seed's codes with the keys the dev server checks them against: the same
 * `CERTIFICATE_SECRET`, which Bun reads from `.env`.
 */
const signer = createCodeSigner(() => {
	const secret = process.env.CERTIFICATE_SECRET;
	if (!secret) throw new Error('CERTIFICATE_SECRET is not set');
	return secret;
});

/** Where the dev server answers the links the codes stand for. */
const ORIGIN = process.env.APP_URL ?? 'https://localhost:5173';

/** Pixels a millimetre of a blank page is rendered at to measure what the form prints in its fields. */
const MEASURE_PER_MM = 6;

/**
 * The signed code of a person's page, as `issuePrintCodes` makes it: where its marks and fields
 * are, with what the form prints in them, measured on the blank page.
 */
async function codeOf({
	pdf,
	placed,
	userId,
	conferenceId,
	issuedAt
}: {
	pdf: PDFDocument;
	placed: PageAreas;
	userId: string;
	conferenceId: string;
	issuedAt: number;
}) {
	const blank = await renderPdfPage({ bytes: await pdf.save(), dpi: MEASURE_PER_MM * 25.4 });
	const printedInk = printedInkOf({
		picture: blank,
		toPicture: ({ x, y }) => ({ x: x * MEASURE_PER_MM, y: y * MEASURE_PER_MM }),
		areas: placed.areas
	});
	const areas = encodeAreas({
		...placed,
		areas: areasAsPrinted({ areas: placed.areas, printedInk })
	});
	return signer.signCode({ kind: 'print', userId, conferenceId, issuedAt, areas });
}

/** Draws a page's code where its layout places it, as the generator does. */
async function drawCode({
	pdf,
	sheet,
	layout,
	code
}: {
	pdf: PDFDocument;
	sheet: PDFPage;
	layout: ScannedPage['layout'];
	code: string;
}) {
	const { width, height } = sheet.getSize();
	const text = signedCodeLink({ origin: ORIGIN, code });
	const modules = qrMatrix({ text, withEmblem: false }).size;
	const square = fitQrSquare({
		square: squareInPoints({ placement: layout.code, width, height }),
		minSide: Math.max(
			DOCUMENT_ELEMENTS.contract.code.minSide * POINTS_PER_MM,
			minQrSide({ modules, corporate: false })
		),
		page: { width, height }
	});
	await drawQr({
		pdf,
		page: sheet,
		text,
		box: { x: square.left, top: square.bottom + square.side, side: square.side },
		corporate: false
	});
}

/** `picture` as a JPEG. */
function jpegOf(picture: Pixels) {
	const canvas = createCanvas(picture.width, picture.height);
	const context = canvas.getContext('2d');
	const image = context.createImageData(picture.width, picture.height);
	image.data.set(picture.data);
	context.putImageData(image, 0, 0);
	return canvas.toBuffer('image/jpeg', 80);
}

/** A scanner's PDF: the scanned picture as its one page, the size of the paper. */
async function scannerPdf({
	jpeg,
	size
}: {
	jpeg: Uint8Array;
	size: { width: number; height: number };
}) {
	const pdf = await PDFDocument.create();
	const image = await pdf.embedJpg(jpeg);
	pdf.addPage([size.width, size.height]).drawImage(image, { x: 0, y: 0, ...size });
	return pdf.save();
}

/**
 * A person's page of the conference's form as it came back: printed with its marks and signed code,
 * filled in as it was read, and scanned a little crooked, as a scanner's PDF or, uploaded, a JPEG.
 */
export async function scannedPage({
	scanned: { document, page, layout, placed, areas, readings },
	userId,
	conferenceId,
	issuedAt,
	angle,
	asPicture
}: {
	scanned: ScannedPage;
	userId: string;
	conferenceId: string;
	issuedAt: number;
	/** How crooked it was scanned, in degrees */
	angle: number;
	asPicture: boolean;
}) {
	const pdf = await PDFDocument.create();
	const [sheet] = await pdf.copyPages(await PDFDocument.load(applicationTemplate(document)), [
		page
	]);
	pdf.addPage(sheet);
	const code = await codeOf({ pdf, placed, userId, conferenceId, issuedAt });
	drawPaperPage({ page: sheet, document, layout, pageIndex: page });
	await drawCode({ pdf, sheet, layout, code });
	for (const area of areas) {
		const state = readings?.find(({ field }) => field === area.field)?.state;
		if (state) fillIn({ page: sheet, area, state });
	}
	const printed = await renderPdfPage({ bytes: await pdf.save(), dpi: 150 });
	const jpeg = jpegOf(simulateScan({ picture: printed, angle, scale: 0.98, noise: 12 }));
	return asPicture
		? { bytes: jpeg, mimeType: 'image/jpeg' }
		: { bytes: await scannerPdf({ jpeg, size: sheet.getSize() }), mimeType: 'application/pdf' };
}

/** A photo nothing can be read off. */
function blurredPhoto() {
	const canvas = createCanvas(620, 877);
	const context = canvas.getContext('2d');
	context.fillStyle = '#b8b4aa';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = '#8f8b82';
	context.font = '28px sans-serif';
	context.fillText('Seed: unscharfes Foto', 60, 120);
	return canvas.toBuffer('image/png');
}

/** A page without a code, which says nothing of what it is. */
async function extraPage() {
	const pdf = await PDFDocument.create();
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	pdf
		.addPage([595, 842])
		.drawText('Seed: Anschreiben ohne Code', { x: 60, y: 760, size: 18, font });
	return pdf.save();
}

/** The kept file of the `index`th page of a pile: the page as scanned, or a photo nothing was read off. */
async function pageFile({
	page,
	index,
	asPicture,
	...code
}: {
	page: ScannedPage;
	index: number;
	userId: string;
	conferenceId: string;
	issuedAt: number;
	asPicture: boolean;
}) {
	if (!page.readings) {
		return { bytes: blurredPhoto(), fileName: 'IMG_2041.png', mimeType: 'image/png' };
	}
	// each page a little otherwise crooked, as fed in by hand
	const scan = await scannedPage({
		scanned: page,
		angle: ((index % 5) - 2) * 0.6,
		asPicture,
		...code
	});
	return { ...scan, fileName: `Stapel_${index + 1}.${asPicture ? 'jpg' : 'pdf'}` };
}

/**
 * The scans of the personas' application documents where the conference has statuses: pages of the
 * conference's own forms, what was read off them and the details that makes. The crowd has statuses
 * only, as a team that ticks them off by hand.
 */
export async function addPostalScans(cs: ConferenceSeed) {
	if (!cs.plan.with.participantStatus) return;
	// in time for the conference, and not in the future
	const at = new Date(Math.min(Date.now() - 5 * DAY_MS, +cs.startConference - 10 * DAY_MS));

	for (const { userId, plan } of paperPlans(cs.plan.conference.state)) {
		const { id: conferenceParticipantId } = cs.participant(userId);
		const keep = ({
			key,
			file,
			...scan
		}: {
			key: string;
			file: { bytes: Uint8Array; fileName: string; mimeType?: string };
		} & Pick<typeof schema.postalScan.$inferInsert, 'source' | 'fields' | 'readings'>) =>
			cs.batch.postalScan.push({
				...scan,
				conferenceParticipantId,
				fileId: addSeedFile({
					batch: cs.batch,
					file: {
						conferenceId: cs.id,
						kind: 'postalScan',
						field: 'scan',
						mimeType: 'application/pdf',
						...file
					}
				}),
				// a hash, as the code's is
				pageKey: createHash('sha256').update(`${conferenceParticipantId}:${key}`).digest('hex'),
				uploadedById: 'dev-team-care',
				createdAt: at,
				updatedAt: at
			});

		const pages = await paperPages({ plan, layouts: cs.conference.documentLayouts });
		const asPicture = plan.source === 'UPLOAD';
		for (const [index, page] of pages.entries()) {
			keep({
				key: `${page.document}:${page.page}`,
				source: plan.source,
				fields: page.areas.map(({ field }) => field),
				readings: page.readings,
				file: await pageFile({
					page,
					index,
					userId,
					conferenceId: cs.id,
					issuedAt: Math.floor(+at / 1000) - 7 * 24 * 60 * 60,
					asPicture
				})
			});
		}
		if (plan.extraPage) {
			keep({
				key: 'extra',
				source: 'UPLOAD',
				fields: [],
				readings: null,
				file: { bytes: await extraPage(), fileName: 'Nachgereicht.pdf' }
			});
		}
		cs.batch.agreementDetail.push(
			...paperDetails({ plan, pages }).map((detail) => ({
				...detail,
				conferenceParticipantId,
				createdAt: at,
				updatedAt: at
			}))
		);
	}
}
