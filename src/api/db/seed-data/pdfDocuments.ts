import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The PDFs a team would upload: the conference's templates (DMUN's own application documents, a
 * certificate laid out like the real one), a venue's site plan and the resolutions a committee
 * passed. The certificate leaves room exactly where `#lib/utils/pdfGenerator.ts` draws its name
 * line and QR corner; a generated document that lands off its line means the generator or the
 * template moved.
 */

const A4: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 70;
const NAVY = rgb(0.1, 0.2, 0.45);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.85, 0.87, 0.92);
const BLACK = rgb(0, 0, 0);

interface Fonts {
	regular: PDFFont;
	bold: PDFFont;
	italic: PDFFont;
}

async function createDocument(title: string) {
	const pdf = await PDFDocument.create();
	pdf.setTitle(title);
	pdf.setAuthor('MUNify DELEGATOR seed');
	pdf.setCreator('MUNify DELEGATOR seed');
	const fonts: Fonts = {
		regular: await pdf.embedFont(StandardFonts.Helvetica),
		bold: await pdf.embedFont(StandardFonts.HelveticaBold),
		italic: await pdf.embedFont(StandardFonts.HelveticaOblique)
	};
	return { pdf, fonts };
}

/**
 * Draws text top-down on a page, wrapping at the margins. `y` is the baseline of the next line;
 * `flow.nextPage` continues on a new page when one is given and the page runs out.
 */
function createWriter({
	page,
	fonts,
	flow
}: {
	page: PDFPage;
	fonts: Fonts;
	flow: { y: number; bottom?: number; nextPage?: () => PDFPage };
}) {
	let current = page;
	let y = flow.y;
	const bottom = flow.bottom ?? 90;
	const right = () => current.getWidth() - MARGIN;

	function lines({
		text,
		font,
		size,
		width
	}: {
		text: string;
		font: PDFFont;
		size: number;
		width: number;
	}) {
		const result: string[] = [];
		let line = '';
		for (const word of text.split(' ')) {
			const candidate = line ? `${line} ${word}` : word;
			if (line && font.widthOfTextAtSize(candidate, size) > width) {
				result.push(line);
				line = word;
			} else {
				line = candidate;
			}
		}
		if (line) result.push(line);
		return result;
	}

	return {
		get y() {
			return y;
		},
		get page() {
			return current;
		},
		skip(points: number) {
			y -= points;
		},
		/** A wrapped paragraph; `hanging` text (a clause number) sits in the indent of its first line. */
		paragraph({
			text,
			options = {}
		}: {
			text: string;
			options?: {
				font?: PDFFont;
				size?: number;
				indent?: number;
				hanging?: string;
				gap?: number;
			};
		}) {
			const font = options.font ?? fonts.regular;
			const size = options.size ?? 10.5;
			const indent = options.indent ?? 0;
			const lineHeight = size * 1.4;
			const wrapped = lines({ text, font, size, width: right() - MARGIN - indent });
			wrapped.forEach((line, index) => {
				if (y < bottom && flow.nextPage) {
					current = flow.nextPage();
					y = current.getHeight() - 80;
				}
				if (index === 0 && options.hanging) {
					current.drawText(options.hanging, { x: MARGIN, y, size, font: fonts.bold });
				}
				current.drawText(line, { x: MARGIN + indent, y, size, font, color: BLACK });
				y -= lineHeight;
			});
			y -= options.gap ?? size * 0.6;
		},
		heading({ text, size = 13 }: { text: string; size?: number }) {
			if (y < bottom + 40 && flow.nextPage) {
				current = flow.nextPage();
				y = current.getHeight() - 80;
			}
			current.drawText(text, { x: MARGIN, y, size, font: fonts.bold, color: NAVY });
			y -= size * 1.8;
		}
	};
}

/** The certificate, landscape: the name centred 215 pt below the top, the QR code bottom right. */
async function certificate(conference: string) {
	const { pdf, fonts } = await createDocument('Teilnahmezertifikat');
	const page = pdf.addPage(A4_LANDSCAPE);
	const { width, height } = page.getSize();
	const centred = ({
		text,
		y,
		size,
		font,
		color = BLACK
	}: {
		text: string;
		y: number;
		size: number;
		font: PDFFont;
		color?: import('pdf-lib').RGB;
	}) =>
		page.drawText(text, {
			x: (width - font.widthOfTextAtSize(text, size)) / 2,
			y,
			size,
			font,
			color
		});

	page.drawRectangle({
		x: 24,
		y: 24,
		width: width - 48,
		height: height - 48,
		borderWidth: 3,
		borderColor: NAVY
	});
	page.drawRectangle({
		x: 32,
		y: 32,
		width: width - 64,
		height: height - 64,
		borderWidth: 0.8,
		borderColor: NAVY
	});
	centred({
		text: 'TEILNAHMEZERTIFIKAT',
		y: height - 110,
		size: 30,
		font: fonts.bold,
		color: NAVY
	});
	centred({ text: 'Hiermit wird bestätigt, dass', y: height - 170, size: 13, font: fonts.italic });
	page.drawLine({
		start: { x: width / 2 - 180, y: height - 222 },
		end: { x: width / 2 + 180, y: height - 222 },
		thickness: 0.8,
		color: GRAY
	});
	centred({ text: 'erfolgreich an der Konferenz', y: height - 260, size: 13, font: fonts.italic });
	centred({ text: conference, y: height - 292, size: 18, font: fonts.bold, color: NAVY });
	centred({ text: 'teilgenommen hat.', y: height - 322, size: 11, font: fonts.regular });

	for (const [index, label] of ['Generalsekretariat', 'Projektleitung'].entries()) {
		const x = 150 + index * 330;
		page.drawLine({
			start: { x, y: 110 },
			end: { x: x + 210, y: 110 },
			thickness: 0.6,
			color: BLACK
		});
		page.drawText(label, { x, y: 96, size: 9, font: fonts.regular, color: GRAY });
	}
	page.drawText('Hannover', { x: 150, y: 70, size: 9, font: fonts.italic, color: GRAY });
	return pdf.save();
}

/** The five templates of one conference, with its title printed in. */
/**
 * The application documents' templates are DMUN's own (`templates/`, taken from a real print with
 * what the generator drew removed): the contract, the guardians' consent, the three pages of the
 * media consent and the terms. The layout's defaults put every field where these have it.
 */
const template = (name: string) =>
	readFileSync(fileURLToPath(new URL(`./templates/${name}.pdf`, import.meta.url)));

export async function conferenceTemplatePdfs(conference: string) {
	return {
		contract: template('contract'),
		guardianConsent: template('guardianConsent'),
		mediaConsent: template('mediaConsent'),
		termsAndConditions: template('termsAndConditions'),
		certificate: await certificate(conference)
	};
}

/** A venue's floor plan, landscape: rooms, the entrance and a legend. */
export async function sitePlanPdf({ venue, rooms }: { venue: string; rooms: string[] }) {
	const { pdf, fonts } = await createDocument(`Lageplan ${venue}`);
	const page = pdf.addPage(A4_LANDSCAPE);
	const { width, height } = page.getSize();
	page.drawText(`Lageplan · ${venue}`, {
		x: 50,
		y: height - 60,
		size: 20,
		font: fonts.bold,
		color: NAVY
	});
	page.drawText('Erdgeschoss', {
		x: 50,
		y: height - 82,
		size: 11,
		font: fonts.italic,
		color: GRAY
	});

	const room = ({
		label,
		x,
		y,
		w,
		h,
		fill = LIGHT
	}: {
		label: string;
		x: number;
		y: number;
		w: number;
		h: number;
		fill?: import('pdf-lib').RGB;
	}) => {
		page.drawRectangle({
			x,
			y,
			width: w,
			height: h,
			color: fill,
			borderColor: NAVY,
			borderWidth: 1.2
		});
		const size = 11;
		page.drawText(label, {
			x: x + (w - fonts.bold.widthOfTextAtSize(label, size)) / 2,
			y: y + h / 2 - size / 3,
			size,
			font: fonts.bold,
			color: NAVY
		});
	};

	const left = 50;
	const top = height - 110;
	const plenary = rooms[0] ?? 'Plenarsaal';
	room({ label: plenary, x: left, y: top - 220, w: 300, h: 220, fill: rgb(0.78, 0.83, 0.93) });
	room({
		label: 'Foyer',
		x: left + 300,
		y: top - 220,
		w: 160,
		h: 220,
		fill: rgb(0.95, 0.95, 0.95)
	});
	const side = rooms.slice(1);
	const roomWidth = (width - 100 - 460) / Math.max(side.length, 1);
	side.forEach((label, index) =>
		room({ label, x: left + 460 + index * roomWidth, y: top - 140, w: roomWidth, h: 140 })
	);
	room({
		label: 'Garderobe',
		x: left + 460,
		y: top - 220,
		w: 120,
		h: 80,
		fill: rgb(0.95, 0.95, 0.95)
	});
	room({
		label: 'WC',
		x: left + 580,
		y: top - 220,
		w: width - 100 - 580,
		h: 80,
		fill: rgb(0.95, 0.95, 0.95)
	});
	room({ label: 'Pressebüro', x: left, y: top - 330, w: 150, h: 110 });
	room({ label: 'Konferenzbüro', x: left + 150, y: top - 330, w: 150, h: 110 });
	room({
		label: 'Cafeteria',
		x: left + 300,
		y: top - 330,
		w: width - 100 - 300,
		h: 110,
		fill: rgb(0.93, 0.96, 0.9)
	});

	// The entrance: an arrow into the foyer from below.
	const entranceX = left + 380;
	page.drawLine({
		start: { x: entranceX, y: top - 370 },
		end: { x: entranceX, y: top - 335 },
		thickness: 2.5,
		color: rgb(0.75, 0.1, 0.1)
	});
	page.drawText('Haupteingang', {
		x: entranceX + 8,
		y: top - 368,
		size: 10,
		font: fonts.bold,
		color: rgb(0.75, 0.1, 0.1)
	});

	const legend = [
		'Sitzungen der Gremien finden in den ausgeschilderten Räumen statt.',
		'Das Konferenzbüro ist während des gesamten Programms besetzt.',
		'Notausgänge sind grün beschildert; Sammelplatz ist der Vorplatz.'
	];
	legend.forEach((line, index) =>
		page.drawText(`– ${line}`, {
			x: 50,
			y: 70 - index * 14,
			size: 9,
			font: fonts.regular,
			color: GRAY
		})
	);
	return pdf.save();
}

/** A passed resolution as the committee's chairs publish it: headline, preamble, operative clauses. */
export async function resolutionPdf(options: {
	conference: string;
	committee: string | null;
	headline: string;
	topic: string;
	number: string;
}) {
	const { pdf, fonts } = await createDocument(`${options.number} ${options.topic}`);
	const first = pdf.addPage(A4);
	const { width, height } = first.getSize();
	first.drawText(options.conference, {
		x: MARGIN,
		y: height - 50,
		size: 9,
		font: fonts.bold,
		color: GRAY
	});
	first.drawText(options.number, {
		x: width - MARGIN - fonts.bold.widthOfTextAtSize(options.number, 9),
		y: height - 50,
		size: 9,
		font: fonts.bold,
		color: GRAY
	});
	first.drawLine({
		start: { x: MARGIN, y: height - 58 },
		end: { x: width - MARGIN, y: height - 58 },
		thickness: 0.6,
		color: GRAY
	});

	const writer = createWriter({
		page: first,
		fonts,
		flow: {
			y: height - 95,
			bottom: 70,
			nextPage: () => pdf.addPage(A4)
		}
	});
	writer.paragraph({ text: options.headline, options: { font: fonts.bold, size: 14 } });
	writer.paragraph({ text: options.topic, options: { font: fonts.bold, size: 12, gap: 18 } });
	writer.paragraph({
		text: `${options.committee ?? 'Die Generalversammlung'},`,
		options: {
			font: fonts.italic,
			gap: 12
		}
	});

	const preamble = [
		[
			'unter Hinweis auf',
			'ihre bisherigen Resolutionen zu diesem Thema sowie die Ziele für nachhaltige Entwicklung,'
		],
		['zutiefst besorgt über', 'die anhaltende Lage und ihre Folgen für die Zivilbevölkerung,'],
		['in Anerkennung', 'der Bemühungen regionaler Organisationen und der Zivilgesellschaft,'],
		[
			'betonend',
			'dass nur ein gemeinsames Handeln der Staatengemeinschaft dauerhafte Lösungen ermöglicht,'
		]
	];
	for (const [opening, rest] of preamble) {
		writer.paragraph({ text: `${opening} ${rest}`, options: { indent: 24, gap: 8 } });
	}
	writer.skip(6);

	const operative = [
		'fordert alle Mitgliedstaaten auf, ihre Zusammenarbeit in diesem Bereich auszubauen und nationale Aktionspläne vorzulegen;',
		'ersucht den Generalsekretär, einen jährlichen Bericht über die Umsetzung dieser Resolution vorzulegen;',
		'beschließt, eine offene Arbeitsgruppe einzurichten, die a) bestehende Programme bewertet, b) Finanzierungsmöglichkeiten über freiwillige Beiträge prüft und c) Empfehlungen für die nächste Tagung erarbeitet;',
		'ermutigt die Mitgliedstaaten, den Austausch bewährter Verfahren zu fördern und Entwicklungsländer beim Aufbau von Kapazitäten zu unterstützen;',
		'beschließt, mit der Angelegenheit aktiv befasst zu bleiben.'
	];
	operative.forEach((clause, index) =>
		writer.paragraph({ text: clause, options: { hanging: `${index + 1}.`, indent: 24, gap: 8 } })
	);

	writer.skip(12);
	writer.paragraph({
		text: `Angenommen mit ${20 + options.topic.length} Ja-Stimmen, 4 Nein-Stimmen und 3 Enthaltungen.`,
		options: {
			font: fonts.italic,
			size: 9
		}
	});
	return pdf.save();
}
