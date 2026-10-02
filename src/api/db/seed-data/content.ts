import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Stored document formats, built the way the app's editors would have saved them.
 *
 * Position and introduction papers, review comments and reviewer snippets are TipTap documents;
 * working papers are the resolution editor's own shape. The conference's contract, consent,
 * terms and certificate templates are PDF data URLs that pdf-lib loads and draws on.
 */

type TipTapNode = {
	type: string;
	attrs?: Record<string, unknown>;
	marks?: { type: string }[];
	text?: string;
	content?: TipTapNode[];
};

const text = (value: string, marks: string[] = []): TipTapNode =>
	marks.length > 0
		? { type: 'text', text: value, marks: marks.map((type) => ({ type })) }
		: { type: 'text', text: value };
const paragraph = (...content: TipTapNode[]): TipTapNode => ({ type: 'paragraph', content });
const bulletList = (...items: string[]): TipTapNode => ({
	type: 'bulletList',
	content: items.map((item) => ({ type: 'listItem', content: [paragraph(text(item))] }))
});

/** A paper in the paper editor's format: a title, a few paragraphs and a list. */
export function paperDocument(title: string, version = 1) {
	return {
		type: 'doc',
		content: [
			paragraph(text(title, ['bold'])),
			paragraph(
				text('Die Delegation bekräftigt ihr Bekenntnis zur Charta der Vereinten Nationen und '),
				text('fordert', ['italic']),
				text(' ein entschlossenes, gemeinsames Handeln der Staatengemeinschaft.')
			),
			paragraph(
				text(
					version > 1
						? `Überarbeitete Fassung (Version ${version}): Quellen ergänzt, Forderungen präzisiert.`
						: 'Erste Fassung, Quellen folgen.'
				)
			),
			bulletList(
				'Ausbau der internationalen Zusammenarbeit',
				'Finanzierung über freiwillige Beiträge',
				'Jährlicher Bericht an die Generalversammlung'
			)
		]
	};
}

/** A working paper in the resolution editor's format. */
export function resolutionDocument(committeeName: string) {
	return {
		committeeName,
		preamble: [
			{ id: 'pre-1', content: 'unter Hinweis auf ihre bisherigen Resolutionen zu diesem Thema,' },
			{ id: 'pre-2', content: 'zutiefst besorgt über die anhaltende Lage,' }
		],
		operative: [
			{
				id: 'op-1',
				blocks: [{ type: 'text', id: 'op-1-text', content: 'fordert alle Mitgliedstaaten auf,' }]
			},
			{
				id: 'op-2',
				blocks: [
					{ type: 'text', id: 'op-2-text', content: 'beschließt,' },
					{
						type: 'subclauses',
						id: 'op-2-sub',
						items: [
							{
								id: 'op-2-a',
								blocks: [
									{ type: 'text', id: 'op-2-a-text', content: 'eine Arbeitsgruppe einzurichten;' }
								]
							},
							{
								id: 'op-2-b',
								blocks: [
									{
										type: 'text',
										id: 'op-2-b-text',
										content: 'mit der Angelegenheit befasst zu bleiben.'
									}
								]
							}
						]
					}
				]
			}
		]
	};
}

/**
 * A working paper the resolution schema rejects, so the paper page shows its "invalid format"
 * alert instead of the document.
 */
export const invalidResolutionDocument = { committeeName: 'Kaputt', preamble: 'kein Array' };

/** Review comments in the review editor's format, which adds headings and quotes. */
export function reviewComments(verdict: 'CHANGES_REQUESTED' | 'ACCEPTED') {
	return {
		type: 'doc',
		content: [
			{ type: 'heading', attrs: { level: 3 }, content: [text('Rückmeldung')] },
			{
				type: 'blockquote',
				content: [paragraph(text('Finanzierung über freiwillige Beiträge'))]
			},
			paragraph(
				text(
					verdict === 'ACCEPTED'
						? 'Sehr gut überarbeitet - das Papier ist angenommen.'
						: 'Bitte die Finanzierung konkretisieren und Quellen angeben.'
				)
			)
		]
	};
}

/** A reviewer snippet; `{{…}}` marks a placeholder the reviewer fills in on insertion. */
export function snippetDocument(body: string) {
	return { type: 'doc', content: [paragraph(text(body))] };
}

/**
 * A one-page A4 PDF as a data URL, standing in for an uploaded template. The postal registration
 * and the certificate draw the participant's details onto its first page, so one page with a
 * visible title is all a template needs to be usable.
 */
export async function pdfTemplate(title: string): Promise<string> {
	const pdf = await PDFDocument.create();
	pdf.setTitle(title);
	const page = pdf.addPage([595.28, 841.89]);
	const font = await pdf.embedFont(StandardFonts.HelveticaBold);
	page.drawText(title, { x: 50, y: 780, size: 22, font, color: rgb(0.1, 0.2, 0.45) });
	page.drawText('Seed template - replace in the conference configuration', {
		x: 50,
		y: 755,
		size: 10,
		font,
		color: rgb(0.5, 0.5, 0.5)
	});
	return `data:application/pdf;base64,${await pdf.saveAsBase64()}`;
}
