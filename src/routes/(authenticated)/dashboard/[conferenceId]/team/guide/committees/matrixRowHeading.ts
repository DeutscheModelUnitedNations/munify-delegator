import type { MatrixRow } from '#lib/guide/workspace';

/** What a row of the committee matrix is called: its page, its own title, or the topic number. */
export function matrixRowHeading({
	row,
	texts
}: {
	row: MatrixRow;
	texts: { missing: string; committeePage: string; agendaItem: (number: number) => string };
}) {
	switch (row.kind) {
		case 'shared':
			return row.label || row.page?.title || texts.missing;
		case 'agendaItem':
			return texts.agendaItem(row.number);
		case 'committeePage':
			return row.label || texts.committeePage;
	}
}
