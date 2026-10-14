import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { translatePaperType } from '$lib/utils/enumTranslations';
import { committeeLine, paperExportJob, paperTypstMeta, type ExportablePaper } from './paperExport';

const year = new Date().getFullYear();

const positionPaper: ExportablePaper = {
	id: 'paper-0000abcdef',
	type: 'POSITION_PAPER',
	conference: { title: 'MUN-SH' },
	agendaItem: { title: 'Water', committee: { name: 'General Assembly', abbreviation: 'GA' } },
	delegation: { assignedNation: null, assignedNonStateActor: { name: 'Amnesty' } }
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
		expect(paperTypstMeta(positionPaper)).toEqual({
			conferenceName: 'MUN-SH',
			paperType: translatePaperType('POSITION_PAPER'),
			entityName: 'Amnesty',
			committeeLine: 'General Assembly (GA)',
			committeeLabel: m.committee(),
			topic: 'Water',
			topicLabel: m.resolutionTopic().replace(':', ''),
			disclaimer: m.paperPrintDisclaimer({ conferenceName: 'MUN-SH' })
		});
	});

	test('falls back to a generic conference name and leaves out the agenda item', () => {
		const meta = paperTypstMeta({
			...positionPaper,
			conference: { title: null },
			agendaItem: null
		});
		expect(meta.conferenceName).toBe('Model UN');
		expect(meta.committeeLine).toBeUndefined();
		expect(meta.topic).toBeUndefined();
	});
});

describe('paperExportJob', () => {
	test('exports working papers as a resolution under the editor header', () => {
		const header = { documentNumber: 'WP/2026/abcdef', conferenceName: 'MUN-SH' };
		expect(paperExportJob({ ...positionPaper, type: 'WORKING_PAPER' }, header)).toEqual({
			kind: 'resolution',
			header,
			docNumber: 'WP/2026/abcdef'
		});
	});

	test('exports a working paper without a header with an empty one', () => {
		expect(paperExportJob({ ...positionPaper, type: 'WORKING_PAPER' }, undefined)).toEqual({
			kind: 'resolution',
			header: {},
			docNumber: undefined
		});
	});

	test('exports other papers as a text document named by type, year and id', () => {
		expect(paperExportJob(positionPaper, undefined)).toEqual({
			kind: 'paper',
			meta: paperTypstMeta(positionPaper),
			docNumber: `POSITION_PAPER/${year}/abcdef`
		});
	});
});
