import { stringify } from 'csv-stringify/browser/esm/sync';

/**
 * Downloads data as a CSV file
 */
export const downloadCSV = (
	header: string[],
	data: string[][],
	filename: string,
	delimiter = ';'
): void => {
	const csv = [header, ...data];
	const blob = new Blob([stringify(csv, { delimiter })], { type: 'text/csv' });
	triggerDownload(blob, filename);
};

/**
 * Downloads data as a JSON file
 */
export const downloadJSON = (data: object, filename: string): void => {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	triggerDownload(blob, filename);
};

/**
 * Triggers a browser download for a blob
 */
const triggerDownload = (blob: Blob, filename: string): void => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
