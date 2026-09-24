import { persisted } from 'svelte-persisted-store';
import { browser } from '$app/environment';

export type CsvDelimiter = ';' | ',' | '\t' | '|';
export type CsvEncoding = 'utf-8' | 'utf-8-bom' | 'iso-8859-1';

export interface CsvSettings {
	delimiter: CsvDelimiter;
	encoding: CsvEncoding;
}

const defaultSettings: CsvSettings = {
	delimiter: ';',
	encoding: 'utf-8'
};

// Only create the persisted store on the client side
function createCsvSettingsStore() {
	if (browser) {
		return persisted<CsvSettings>('csvExportSettings', defaultSettings);
	}
	// Return a dummy store for SSR that won't persist
	return {
		subscribe: (fn: (value: CsvSettings) => void) => {
			fn(defaultSettings);
			return () => {};
		},
		set: () => {},
		update: () => {}
	};
}

export const csvSettings = createCsvSettingsStore();

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
