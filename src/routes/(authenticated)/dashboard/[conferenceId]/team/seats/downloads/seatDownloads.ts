import { client } from '#lib/api/rumbleClient/client';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { toast } from 'svelte-sonner';
import { m } from '#lib/paraglide/messages';
import { compareByText } from './sortRows';

/** The conference title the seat exports put into their file names, fetched once per export. */
export async function fetchConferenceTitle(conferenceId: string) {
	const conference = await client.query.conference({
		__args: { id: conferenceId },
		id: true,
		title: true
	});
	return conference.title;
}

/** Turns a title into the file name prefix the seat exports have always used. */
export function fileNamePrefix(title: string) {
	return title.replace(' ', '_');
}

/** Downloads rows as a semicolon separated CSV, the format the seat exports have always used. */
export function downloadSemicolonCsv({ rows, filename }: { rows: CsvCell[][]; filename: string }) {
	const blob = new Blob([stringify(rows, { delimiter: ';' })], { type: 'text/csv' });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	window.URL.revokeObjectURL(url);
}

type CsvCell = string | null | undefined;

/**
 * Downloads `items` as one row each under `header`, sorted by `sortKey`; says so instead when
 * there is nothing to download.
 */
export function downloadSortedCsv<T>({
	items,
	header,
	sortKey,
	row,
	filename
}: {
	items: readonly T[];
	header: string[];
	sortKey: (item: T) => CsvCell;
	row: (item: T) => CsvCell[];
	filename: string;
}) {
	if (items.length === 0) {
		toast.error(m.noDataFound());
		return;
	}
	downloadSemicolonCsv({
		rows: [header, ...[...items].sort(compareByText(sortKey)).map(row)],
		filename
	});
}
