import { PersistedState } from './persistedState.svelte';

export type CsvDelimiter = ';' | ',' | '\t' | '|';
export type CsvEncoding = 'utf-8' | 'utf-8-bom' | 'iso-8859-1';

interface CsvSettings {
	delimiter: CsvDelimiter;
	encoding: CsvEncoding;
}

const defaultSettings: CsvSettings = {
	delimiter: ';',
	encoding: 'utf-8'
};

export const csvSettings = new PersistedState<CsvSettings>('csvExportSettings', defaultSettings);

// Helper to get the delimiter label for display
export function getDelimiterLabel(delimiter: CsvDelimiter): string {
	switch (delimiter) {
		case ';':
			return 'Semicolon (;)';
		case ',':
			return 'Comma (,)';
		case '\t':
			return 'Tab';
		case '|':
			return 'Pipe (|)';
		default:
			return delimiter;
	}
}

// Helper to get the encoding label for display
export function getEncodingLabel(encoding: CsvEncoding): string {
	switch (encoding) {
		case 'utf-8':
			return 'UTF-8';
		case 'utf-8-bom':
			return 'UTF-8 with BOM';
		case 'iso-8859-1':
			return 'ISO-8859-1 (Latin-1)';
		default:
			return encoding;
	}
}
