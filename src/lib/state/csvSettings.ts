import { createPersistedState } from './persistedState.svelte';

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

export const csvSettings = createPersistedState<CsvSettings>({
	key: 'csvExportSettings',
	initial: defaultSettings
});

const delimiterLabels: Record<CsvDelimiter, string> = {
	';': 'Semicolon (;)',
	',': 'Comma (,)',
	'\t': 'Tab',
	'|': 'Pipe (|)'
};

const encodingLabels: Record<CsvEncoding, string> = {
	'utf-8': 'UTF-8',
	'utf-8-bom': 'UTF-8 with BOM',
	'iso-8859-1': 'ISO-8859-1 (Latin-1)'
};

// Helpers to get the labels for display; a value stored by an older version shows as itself
export const getDelimiterLabel = (delimiter: CsvDelimiter): string =>
	delimiterLabels[delimiter] ?? delimiter;

export const getEncodingLabel = (encoding: CsvEncoding): string =>
	encodingLabels[encoding] ?? encoding;
