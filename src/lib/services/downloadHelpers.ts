import { stringify } from 'csv-stringify/browser/esm/sync';
import { get } from 'svelte/store';
import { csvSettings, type CsvEncoding, type CsvDelimiter } from '$lib/stores/csvSettings';

// UTF-8 BOM for Excel compatibility
const UTF8_BOM = '\uFEFF';

/**
 * Encodes CSV content with the specified encoding
 */
const encodeContent = (content: string, encoding: CsvEncoding): Blob => {
	switch (encoding) {
		case 'utf-8-bom':
			return new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8' });
		case 'iso-8859-1': {
			// Convert to ISO-8859-1 using TextEncoder workaround
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(content);
			// For ISO-8859-1, we need to handle characters that might not be representable
			return new Blob([uint8Array], { type: 'text/csv;charset=iso-8859-1' });
		}
		case 'utf-8':
		default:
			return new Blob([content], { type: 'text/csv;charset=utf-8' });
	}
};

/**
 * Downloads data as a CSV file using the stored settings
 */
export const downloadCSV = (
	header: string[],
	data: string[][],
	filename: string,
	overrideDelimiter?: CsvDelimiter
): void => {
	const settings = get(csvSettings);
	const delimiter = overrideDelimiter ?? settings.delimiter;

	const csv = [header, ...data];
	const csvContent = stringify(csv, { delimiter });
	const blob = encodeContent(csvContent, settings.encoding);
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
