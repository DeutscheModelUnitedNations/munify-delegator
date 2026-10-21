import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/**
 * The PDFs a team would upload, laid out the way the real ones are: the conference's templates,
 * a venue's site plan and the resolutions a committee passed.
 *
 * The templates leave room exactly where `#lib/utils/pdfGenerator.ts` draws: the contract's
 * address window and data matrix, each form's name / birthday / address line, the footer the
 * postal registration numbers its pages in, and the certificate's name line and QR corner. A
 * generated document that lands off its line means the generator or the template moved.
 */

const A4: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 70;
const NAVY = rgb(0.1, 0.2, 0.45);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.85, 0.87, 0.92);
const BLACK = rgb(0, 0, 0);

const mm = (value: number) => (value * A4[1]) / 297;

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
function createWriter(
	page: PDFPage,
	fonts: Fonts,
	flow: { y: number; bottom?: number; nextPage?: () => PDFPage }
) {
	let current = page;
	let y = flow.y;
	const bottom = flow.bottom ?? 90;
	const right = () => current.getWidth() - MARGIN;

	function lines(text: string, font: PDFFont, size: number, width: number) {
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
		paragraph(
			text: string,
			options: {
				font?: PDFFont;
				size?: number;
				indent?: number;
				hanging?: string;
				gap?: number;
			} = {}
		) {
			const font = options.font ?? fonts.regular;
			const size = options.size ?? 10.5;
			const indent = options.indent ?? 0;
			const lineHeight = size * 1.4;
			const wrapped = lines(text, font, size, right() - MARGIN - indent);
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
		heading(text: string, size = 13) {
			if (y < bottom + 40 && flow.nextPage) {
				current = flow.nextPage();
				y = current.getHeight() - 80;
			}
			current.drawText(text, { x: MARGIN, y, size, font: fonts.bold, color: NAVY });
			y -= size * 1.8;
		}
	};
}

/** The letterhead every template starts with: a band, the conference and the document's title. */
function letterhead(page: PDFPage, fonts: Fonts, conference: string, title: string) {
	const { width, height } = page.getSize();
	page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: NAVY });
	page.drawText(conference, { x: MARGIN, y: height - 42, size: 9, font: fonts.bold, color: GRAY });
	page.drawText(title, { x: MARGIN, y: height - 66, size: 18, font: fonts.bold, color: NAVY });
}

/**
 * A labelled form line: the label sits above, the line just below the baseline the generator
 * writes on (`baseline`), so the filled-in value reads as written on the line.
 */
function formLine(page: PDFPage, fonts: Fonts, label: string, baseline: number, width = 300) {
	page.drawText(label, { x: MARGIN, y: baseline + 20, size: 8, font: fonts.regular, color: GRAY });
	page.drawLine({
		start: { x: MARGIN, y: baseline - 4 },
		end: { x: MARGIN + width, y: baseline - 4 },
		thickness: 0.6,
		color: GRAY
	});
}

/** Two signature lines with place/date and who signs. */
function signatures(page: PDFPage, fonts: Fonts, y: number, left: string, right: string) {
	const half = (page.getWidth() - 2 * MARGIN - 30) / 2;
	for (const [index, label] of [left, right].entries()) {
		const x = MARGIN + index * (half + 30);
		page.drawLine({ start: { x, y }, end: { x: x + half, y }, thickness: 0.6, color: BLACK });
		page.drawText(label, { x, y: y - 12, size: 8, font: fonts.regular, color: GRAY });
	}
}

/** The participation contract: address window, data matrix corner, name and birthday lines. */
async function contract(conference: string) {
	const { pdf, fonts } = await createDocument('Teilnahmevertrag');
	const page = pdf.addPage(A4);
	const { height } = page.getSize();
	letterhead(page, fonts, conference, 'Teilnahmevertrag');

	// DIN 5008 window: the sender line above the recipient, which the generator writes from 60 mm.
	page.drawText(`${conference} · Musterstraße 1 · 30159 Hannover`, {
		x: mm(25),
		y: height - mm(55),
		size: 7,
		font: fonts.regular,
		color: GRAY
	});
	page.drawLine({
		start: { x: mm(25), y: height - mm(56) },
		end: { x: mm(105), y: height - mm(56) },
		thickness: 0.4,
		color: GRAY
	});

	page.drawText('zwischen der Konferenzleitung und der teilnehmenden Person', {
		x: MARGIN,
		y: height - 255,
		size: 10.5,
		font: fonts.italic
	});
	formLine(page, fonts, 'Vor- und Nachname der teilnehmenden Person', height - 320);
	formLine(page, fonts, 'Geburtsdatum', height - 380, 160);

	const writer = createWriter(page, fonts, { y: height - 420 });
	const clauses = [
		'Die teilnehmende Person meldet sich verbindlich zur Konferenz an. Mit der Unterschrift erkennt sie die beigefügten Teilnahmebedingungen an.',
		'Der Teilnahmebeitrag ist bis zum in der Anwendung genannten Datum zu überweisen. Erst mit Eingang von Zahlung und unterschriebener Postanmeldung ist die Anmeldung vollständig.',
		'Die Konferenzleitung stellt Tagungsräume, Verpflegung während der Sitzungen und Konferenzmaterialien. Unterkunft und Anreise organisiert die teilnehmende Person selbst.',
		'Ein Rücktritt ist schriftlich zu erklären. Bis vier Wochen vor Konferenzbeginn wird der Beitrag abzüglich einer Bearbeitungsgebühr erstattet, danach nicht mehr.',
		'Die teilnehmende Person verpflichtet sich, die Verhaltensregeln der Konferenz einzuhalten. Bei groben Verstößen kann sie von der weiteren Teilnahme ausgeschlossen werden.'
	];
	clauses.forEach((clause, index) =>
		writer.paragraph(clause, { hanging: `§ ${index + 1}`, indent: 28 })
	);

	signatures(page, fonts, 150, 'Ort, Datum', 'Unterschrift der teilnehmenden Person');
	return pdf.save();
}

/** The guardians' consent for a minor: name and birthday from 180 pt below the top. */
async function guardianConsent(conference: string) {
	const { pdf, fonts } = await createDocument('Einverständniserklärung der Erziehungsberechtigten');
	const page = pdf.addPage(A4);
	const { height } = page.getSize();
	letterhead(page, fonts, conference, 'Einverständniserklärung');
	page.drawText('der Erziehungsberechtigten für minderjährige Teilnehmende', {
		x: MARGIN,
		y: height - 86,
		size: 10.5,
		font: fonts.italic
	});
	page.drawText('Hiermit erlauben wir / erlaube ich', {
		x: MARGIN,
		y: height - 130,
		size: 10.5,
		font: fonts.regular
	});
	formLine(page, fonts, 'Vor- und Nachname der teilnehmenden Person', height - 180);
	formLine(page, fonts, 'Geburtsdatum', height - 240, 160);

	const writer = createWriter(page, fonts, { y: height - 285 });
	writer.paragraph(
		`die Teilnahme an der Konferenz ${conference} einschließlich des Rahmenprogramms und der Übernachtungen.`
	);
	writer.skip(8);
	for (const item of [
		'Die teilnehmende Person darf sich in den Pausen und abends in Kleingruppen ohne Aufsicht in der Stadt bewegen.',
		'Die Konferenzleitung darf im Notfall ärztliche Hilfe veranlassen, wenn wir nicht rechtzeitig erreichbar sind.',
		'Allergien, Medikamente und Unverträglichkeiten haben wir im Profil der Anwendung angegeben.',
		'Bei Verstößen gegen die Verhaltensregeln kann die teilnehmende Person auf unsere Kosten nach Hause geschickt werden.'
	]) {
		writer.paragraph(item, { hanging: '–', indent: 16 });
	}
	writer.skip(10);
	writer.paragraph('Notfallkontakt während der Konferenz (Name, Telefonnummer):', { size: 9 });
	page.drawLine({
		start: { x: MARGIN, y: writer.y - 6 },
		end: { x: page.getWidth() - MARGIN, y: writer.y - 6 },
		thickness: 0.6,
		color: GRAY
	});

	signatures(page, fonts, 150, 'Ort, Datum', 'Unterschrift aller Erziehungsberechtigten');
	return pdf.save();
}

/** The photo and video consent: name, birthday and address lines 42 pt apart from 225 pt down. */
async function mediaConsent(conference: string) {
	const { pdf, fonts } = await createDocument('Einwilligung zu Foto- und Filmaufnahmen');
	const page = pdf.addPage(A4);
	const { height } = page.getSize();
	letterhead(page, fonts, conference, 'Einwilligung zu Foto- und Filmaufnahmen');

	const intro = createWriter(page, fonts, { y: height - 110 });
	intro.paragraph(
		'Während der Konferenz entstehen Fotos und Videos, die wir für die Berichterstattung, unsere Website und soziale Medien nutzen möchten. Dafür brauchen wir die Einwilligung der abgebildeten Person.'
	);
	formLine(page, fonts, 'Vor- und Nachname', height - 225);
	formLine(page, fonts, 'Geburtsdatum', height - 267, 160);
	formLine(page, fonts, 'Anschrift', height - 309, page.getWidth() - 2 * MARGIN);

	const writer = createWriter(page, fonts, { y: height - 350 });
	writer.paragraph('Ich willige ein, dass Aufnahmen von mir veröffentlicht werden dürfen:', {
		font: fonts.bold
	});
	for (const option of [
		'in der Konferenzzeitung und im Abschlussbericht',
		'auf der Website der Konferenz',
		'in den sozialen Medien der Konferenz',
		'in Pressemitteilungen'
	]) {
		page.drawRectangle({
			x: MARGIN,
			y: writer.y - 1,
			width: 9,
			height: 9,
			borderWidth: 0.8,
			borderColor: BLACK
		});
		writer.paragraph(option, { indent: 18, gap: 4 });
	}
	writer.skip(10);
	writer.paragraph(
		'Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden. Bereits gedruckte Materialien können nicht zurückgerufen werden. Ohne Einwilligung entstehen keine Nachteile für die Teilnahme.',
		{ size: 9 }
	);

	signatures(
		page,
		fonts,
		150,
		'Ort, Datum',
		'Unterschrift (bei Minderjährigen zusätzlich der Erziehungsberechtigten)'
	);
	return pdf.save();
}

const TERMS = [
	[
		'Geltungsbereich',
		'Diese Bedingungen gelten für alle Teilnehmenden, Betreuenden und Gäste der Konferenz. Abweichende Vereinbarungen bedürfen der Textform.'
	],
	[
		'Anmeldung',
		'Die Anmeldung erfolgt über die Anwendung. Sie wird mit der Bestätigung der Konferenzleitung, dem Eingang des Teilnahmebeitrags und der unterschriebenen Postanmeldung verbindlich. Ein Anspruch auf eine bestimmte Rolle besteht nicht.'
	],
	[
		'Zuteilung',
		'Die Konferenzleitung teilt Delegationen, Ausschüsse und Rollen nach eigenem Ermessen zu. Wünsche werden berücksichtigt, soweit es die Zusammensetzung der Gremien erlaubt.'
	],
	[
		'Teilnahmebeitrag',
		'Der Beitrag deckt Tagungsräume, Material, Verpflegung während der Sitzungen und das Rahmenprogramm. Er ist innerhalb der in der Anwendung genannten Frist zu überweisen; als Verwendungszweck ist die angezeigte Referenz anzugeben.'
	],
	[
		'Rücktritt',
		'Ein Rücktritt ist jederzeit in Textform möglich. Bis vier Wochen vor Konferenzbeginn wird der Beitrag abzüglich einer Bearbeitungsgebühr erstattet. Danach ist eine Erstattung nur möglich, wenn ein Platz von der Warteliste nachbesetzt wird.'
	],
	[
		'Absage durch die Konferenzleitung',
		'Muss die Konferenz aus Gründen abgesagt werden, die die Konferenzleitung nicht zu vertreten hat, wird der Beitrag abzüglich bereits entstandener Kosten erstattet. Weitere Ansprüche bestehen nicht.'
	],
	[
		'Verhaltensregeln',
		'Alle Teilnehmenden begegnen einander respektvoll. Diskriminierung, Belästigung und der Konsum von Alkohol oder Drogen während der Sitzungen sind untersagt. Den Anweisungen des Konferenzteams ist Folge zu leisten.'
	],
	[
		'Aufsicht',
		'Minderjährige Teilnehmende stehen während der Sitzungen unter der Aufsicht des Konferenzteams. Außerhalb der Sitzungen gilt, was die Erziehungsberechtigten in ihrer Einverständniserklärung festgelegt haben.'
	],
	[
		'Haftung',
		'Die Konferenzleitung haftet nur für Vorsatz und grobe Fahrlässigkeit. Für mitgebrachte Gegenstände wird keine Haftung übernommen. Schäden an Räumen und Ausstattung tragen die Verursachenden.'
	],
	[
		'Datenschutz',
		'Personenbezogene Daten werden ausschließlich zur Durchführung der Konferenz verarbeitet und nach Abschluss der Nachbereitung gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten bestehen. Näheres regelt die Datenschutzerklärung.'
	],
	[
		'Foto- und Filmaufnahmen',
		'Für die Veröffentlichung von Aufnahmen gilt die gesonderte Einwilligung. Aufnahmen für die interne Dokumentation sind davon unabhängig zulässig.'
	],
	[
		'Teilnahmezertifikat',
		'Ein Zertifikat erhält, wer an den Sitzungen der Konferenz anwesend war. Die Anwesenheit wird über die Zugangskarten erfasst. Das Zertifikat trägt einen QR-Code, über den seine Echtheit geprüft werden kann.'
	],
	[
		'Schlussbestimmungen',
		'Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt. Es gilt deutsches Recht. Gerichtsstand ist, soweit zulässig, der Sitz des Vereins.'
	]
] as const;

/** The terms, appended to the postal registration as its appendix: several pages of clauses. */
async function termsAndConditions(conference: string) {
	const { pdf, fonts } = await createDocument('Teilnahmebedingungen');
	const first = pdf.addPage(A4);
	letterhead(first, fonts, conference, 'Teilnahmebedingungen');
	const writer = createWriter(first, fonts, {
		y: first.getHeight() - 110,
		bottom: 110,
		nextPage: () => pdf.addPage(A4)
	});
	TERMS.forEach(([title, body], index) => {
		writer.heading(`§ ${index + 1} ${title}`, 11.5);
		writer.paragraph(body, { gap: 14 });
	});
	writer.paragraph(`Stand: ${new Date().getFullYear()}`, { size: 8, font: fonts.italic });
	return pdf.save();
}

/** The certificate, landscape: the name centred 215 pt below the top, the QR code bottom right. */
async function certificate(conference: string) {
	const { pdf, fonts } = await createDocument('Teilnahmezertifikat');
	const page = pdf.addPage(A4_LANDSCAPE);
	const { width, height } = page.getSize();
	const centred = (text: string, y: number, size: number, font: PDFFont, color = BLACK) =>
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
	centred('TEILNAHMEZERTIFIKAT', height - 110, 30, fonts.bold, NAVY);
	centred('Hiermit wird bestätigt, dass', height - 170, 13, fonts.italic);
	page.drawLine({
		start: { x: width / 2 - 180, y: height - 222 },
		end: { x: width / 2 + 180, y: height - 222 },
		thickness: 0.8,
		color: GRAY
	});
	centred('erfolgreich an der Konferenz', height - 260, 13, fonts.italic);
	centred(conference, height - 292, 18, fonts.bold, NAVY);
	centred('teilgenommen hat.', height - 322, 11, fonts.regular);

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
export async function conferenceTemplatePdfs(conference: string) {
	return {
		contract: await contract(conference),
		guardianConsent: await guardianConsent(conference),
		mediaConsent: await mediaConsent(conference),
		termsAndConditions: await termsAndConditions(conference),
		certificate: await certificate(conference)
	};
}

/** A venue's floor plan, landscape: rooms, the entrance and a legend. */
export async function sitePlanPdf(venue: string, rooms: string[]) {
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

	const room = (label: string, x: number, y: number, w: number, h: number, fill = LIGHT) => {
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
	room(plenary, left, top - 220, 300, 220, rgb(0.78, 0.83, 0.93));
	room('Foyer', left + 300, top - 220, 160, 220, rgb(0.95, 0.95, 0.95));
	const side = rooms.slice(1);
	const roomWidth = (width - 100 - 460) / Math.max(side.length, 1);
	side.forEach((label, index) =>
		room(label, left + 460 + index * roomWidth, top - 140, roomWidth, 140)
	);
	room('Garderobe', left + 460, top - 220, 120, 80, rgb(0.95, 0.95, 0.95));
	room('WC', left + 580, top - 220, width - 100 - 580, 80, rgb(0.95, 0.95, 0.95));
	room('Pressebüro', left, top - 330, 150, 110);
	room('Konferenzbüro', left + 150, top - 330, 150, 110);
	room('Cafeteria', left + 300, top - 330, width - 100 - 300, 110, rgb(0.93, 0.96, 0.9));

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

	const writer = createWriter(first, fonts, {
		y: height - 95,
		bottom: 70,
		nextPage: () => pdf.addPage(A4)
	});
	writer.paragraph(options.headline, { font: fonts.bold, size: 14 });
	writer.paragraph(options.topic, { font: fonts.bold, size: 12, gap: 18 });
	writer.paragraph(`${options.committee ?? 'Die Generalversammlung'},`, {
		font: fonts.italic,
		gap: 12
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
		writer.paragraph(`${opening} ${rest}`, { indent: 24, gap: 8 });
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
		writer.paragraph(clause, { hanging: `${index + 1}.`, indent: 24, gap: 8 })
	);

	writer.skip(12);
	writer.paragraph(
		`Angenommen mit ${20 + options.topic.length} Ja-Stimmen, 4 Nein-Stimmen und 3 Enthaltungen.`,
		{
			font: fonts.italic,
			size: 9
		}
	);
	return pdf.save();
}
