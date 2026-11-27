import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { translatePaperType } from '#lib/utils/enumTranslations';
import {
	committeeLine,
	paperDocumentNumber,
	paperExportJob,
	paperTypstBranding,
	paperTypstMeta,
	type ExportablePaper
} from './paperExport';

const year = new Date().getFullYear();

const positionPaper: ExportablePaper = {
	id: 'paper-0000abcdef',
	type: 'POSITION_PAPER',
	conference: { title: 'MUN-SH', language: 'eng', series: { abbreviation: 'MUN-SH' } },
	agendaItem: { title: 'Water', committee: { name: 'General Assembly', abbreviation: 'GA' } },
	delegation: { assignedRole: { kind: 'NON_STATE_ACTOR', name: 'Amnesty', nation: null } }
};

describe('committeeLine', () => {
	test('adds the abbreviation in parentheses', () => {
		expect(committeeLine({ name: 'General Assembly', abbreviation: 'GA' })).toBe(
			'General Assembly (GA)'
		);
	});

	test('leaves out an empty abbreviation', () => {
		expect(committeeLine({ name: 'General Assembly', abbreviation: '' })).toBe('General Assembly');
	});

	test('has no line without a committee name', () => {
		expect(committeeLine(undefined)).toBeUndefined();
		expect(committeeLine({ name: '', abbreviation: 'GA' })).toBeUndefined();
	});
});

describe('paperTypstMeta', () => {
	test('describes the paper, its author and committee', () => {
		expect(paperTypstMeta({ paper: positionPaper, documentNumber: 'PP-1' })).toEqual({
			paperType: translatePaperType('POSITION_PAPER'),
			entityName: 'Amnesty',
			committeeLine: 'General Assembly (GA)',
			committeeLabel: m.committee(),
			topic: 'Water',
			topicLabel: m.resolutionTopic().replace(':', ''),
			disclaimer: m.paperPrintDisclaimer({ conferenceName: 'MUN-SH' }),
			documentNumber: 'PP-1'
		});
	});

	test('falls back to a generic conference name and leaves out the agenda item', () => {
		const meta = paperTypstMeta({
			paper: { ...positionPaper, conference: { title: null }, agendaItem: null }
		});
		expect(meta.disclaimer).toBe(m.paperPrintDisclaimer({ conferenceName: 'Model UN' }));
		expect(meta.committeeLine).toBeUndefined();
		expect(meta.topic).toBeUndefined();
	});
});

describe('paperTypstBranding', () => {
	test('takes the brand from the series and the language from the conference', () => {
		expect(paperTypstBranding(positionPaper)).toEqual({
			conferenceName: 'MUN-SH',
			brand: 'mun-sh',
			lang: 'en'
		});
	});

	test('prints as DMUN in German without a series or language', () => {
		expect(paperTypstBranding({ ...positionPaper, conference: { title: null } })).toEqual({
			conferenceName: 'Model UN',
			brand: 'dmun',
			lang: 'de'
		});
	});
});

test('paperDocumentNumber is type code, year and the end of the id', () => {
	expect(paperDocumentNumber({ id: 'paper-0000abcdef', type: 'INTRODUCTION_PAPER' })).toBe(
		`IP-${year}-ABCDEF`
	);
});

describe('paperExportJob', () => {
	test('exports working papers as a resolution under the editor header', () => {
		const header = { documentNumber: 'WP/2026/abcdef', conferenceName: 'MUN-SH' };
		expect(
			paperExportJob({
				paper: { ...positionPaper, type: 'WORKING_PAPER' },
				resolutionHeaderData: header
			})
		).toEqual({
			kind: 'resolution',
			header,
			docNumber: 'WP/2026/abcdef'
		});
	});

	test('exports a working paper without a header with an empty one', () => {
		expect(
			paperExportJob({
				paper: { ...positionPaper, type: 'WORKING_PAPER' },
				resolutionHeaderData: undefined
			})
		).toEqual({
			kind: 'resolution',
			header: {},
			docNumber: undefined
		});
	});

	test('exports other papers as a text document named by type, year and id', () => {
		expect(paperExportJob({ paper: positionPaper, resolutionHeaderData: undefined })).toEqual({
			kind: 'paper',
			meta: paperTypstMeta({ paper: positionPaper, documentNumber: `PP-${year}-ABCDEF` }),
			branding: paperTypstBranding(positionPaper),
			docNumber: `PP-${year}-ABCDEF`
		});
	});
});
