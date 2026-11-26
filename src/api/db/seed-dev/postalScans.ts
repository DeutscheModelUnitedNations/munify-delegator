import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, StandardFonts, type PDFPage } from 'pdf-lib';
import { POINTS_PER_MM, resolveDocumentLayout } from '#lib/helpers/documentLayout';
import { planDetails, type AgreementField } from '#lib/paperScan/agreementDetails';
import type { PaperArea } from '#lib/paperScan/areas';
import { PAPER_FIELDS, type PaperField } from '#lib/paperScan/fields';
import { pageAreas, POSTAL_DOCUMENTS, type PostalDocument } from '#lib/paperScan/pageAreas';
import type { FieldReading, FieldState } from '#lib/paperScan/readPaper';
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

/** A page of a persona's documents, its fields and what was read off it (`null`: nothing). */
interface ScannedPage {
	document: PostalDocument;
	page: number;
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
			const { areas } = pageAreas({
				document,
				layout: resolveDocumentLayout({ document, stored: layouts }),
				page,
				size: { width, height }
			});
			const unreadable = plan.unreadable?.includes(`${document}:${page}`) ?? false;
			const readings = unreadable ? null : areas.map(({ field }) => readingOf({ field, plan }));
			pages.push({ document, page, areas, readings });
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

/** A page of the conference's form, filled in as it was read. */
async function filledPage({ document, page, areas, readings }: ScannedPage) {
	const pdf = await PDFDocument.create();
	const [sheet] = await pdf.copyPages(await PDFDocument.load(applicationTemplate(document)), [
		page
	]);
	pdf.addPage(sheet);
	for (const area of areas) {
		const state = readings?.find(({ field }) => field === area.field)?.state;
		if (state) fillIn({ page: sheet, area, state });
	}
	return pdf.save();
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
		for (const [index, page] of pages.entries()) {
			keep({
				key: `${page.document}:${page.page}`,
				source: plan.source,
				fields: page.areas.map(({ field }) => field),
				readings: page.readings,
				file: page.readings
					? { bytes: await filledPage(page), fileName: `Stapel_${index + 1}.pdf` }
					: { bytes: blurredPhoto(), fileName: 'IMG_2041.png', mimeType: 'image/png' }
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
