/**
 * Stored document formats, built the way the app's editors would have saved them.
 *
 * Position and introduction papers, review comments and reviewer snippets are TipTap documents;
 * working papers are the resolution editor's own shape. The PDFs a team uploads are in
 * `pdfDocuments.ts`.
 */

type TipTapNode = {
	type: string;
	attrs?: Record<string, unknown>;
	marks?: { type: string }[];
	text?: string;
	content?: TipTapNode[];
};

const text = ({ value, marks = [] }: { value: string; marks?: string[] }): TipTapNode =>
	marks.length > 0
		? { type: 'text', text: value, marks: marks.map((type) => ({ type })) }
		: { type: 'text', text: value };
const paragraph = (...content: TipTapNode[]): TipTapNode => ({ type: 'paragraph', content });
const bulletList = (...items: string[]): TipTapNode => ({
	type: 'bulletList',
	content: items.map((item) => ({ type: 'listItem', content: [paragraph(text({ value: item }))] }))
});

/** A paper in the paper editor's format: a title, a few paragraphs and a list. */
export function paperDocument({ title, version = 1 }: { title: string; version?: number }) {
	return {
		type: 'doc',
		content: [
			paragraph(text({ value: title, marks: ['bold'] })),
			paragraph(
				text({
					value: 'Die Delegation bekräftigt ihr Bekenntnis zur Charta der Vereinten Nationen und '
				}),
				text({ value: 'fordert', marks: ['italic'] }),
				text({ value: ' ein entschlossenes, gemeinsames Handeln der Staatengemeinschaft.' })
			),
			paragraph(
				text({
					value:
						version > 1
							? `Überarbeitete Fassung (Version ${version}): Quellen ergänzt, Forderungen präzisiert.`
							: 'Erste Fassung, Quellen folgen.'
				})
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
			{ type: 'heading', attrs: { level: 3 }, content: [text({ value: 'Rückmeldung' })] },
			{
				type: 'blockquote',
				content: [paragraph(text({ value: 'Finanzierung über freiwillige Beiträge' }))]
			},
			paragraph(
				text({
					value:
						verdict === 'ACCEPTED'
							? 'Sehr gut überarbeitet - das Papier ist angenommen.'
							: 'Bitte die Finanzierung konkretisieren und Quellen angeben.'
				})
			)
		]
	};
}

/** A reviewer snippet; `{{…}}` marks a placeholder the reviewer fills in on insertion. */
export function snippetDocument(body: string) {
	return { type: 'doc', content: [paragraph(text({ value: body }))] };
}
