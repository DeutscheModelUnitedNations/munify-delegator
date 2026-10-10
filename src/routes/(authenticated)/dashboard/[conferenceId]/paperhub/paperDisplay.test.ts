import { describe, expect, test } from 'vitest';
import { get } from 'svelte/store';
import { createEmptyResolution } from '$lib/components/paper/editor/resolution';
import { editorContentStore, resolutionStore } from '$lib/components/paper/editor/editorStore';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { translatePaperType } from '$lib/utils/enumTranslations';
import {
	buildResolutionHeaderData,
	currentEditorContent,
	loadPaperIntoEditor,
	paperEntityName,
	paperTitle,
	resolutionHeader,
	type PaperConferenceInfo,
	type PaperIdentity
} from './paperDisplay';

const year = new Date().getFullYear();

function workingPaper(overrides: Partial<PaperIdentity> = {}): PaperIdentity {
	return {
		id: 'paper-0000abcdef',
		type: 'WORKING_PAPER',
		agendaItem: {
			title: 'Climate change',
			committee: { abbreviation: 'GA', name: 'General Assembly', resolutionHeadline: 'Resolves' }
		},
		delegation: {
			assignedNation: { alpha2Code: 'DE', alpha3Code: 'DEU' },
			assignedNonStateActor: null
		},
		...overrides
	};
}

const conference: PaperConferenceInfo = {
	title: 'MUN-SH',
	longTitle: 'Model United Nations Schleswig-Holstein',
	emblemDataURL: 'data:image/png;base64,AAAA'
};

describe('paperTitle', () => {
	test('names the committee and agenda item', () => {
		expect(paperTitle(workingPaper())).toBe('GA: Climate change');
	});

	test('falls back to the paper type without an agenda item', () => {
		expect(paperTitle(workingPaper({ agendaItem: null }))).toBe(
			translatePaperType('WORKING_PAPER')
		);
	});
});

describe('paperEntityName', () => {
	test('prefers the nation, then the non-state actor', () => {
		expect(paperEntityName(workingPaper().delegation)).toBe(
			getFullTranslatedCountryNameFromISO3Code('DEU')
		);
		expect(
			paperEntityName({ assignedNation: null, assignedNonStateActor: { name: 'Amnesty' } })
		).toBe('Amnesty');
		expect(paperEntityName({ assignedNation: null, assignedNonStateActor: null })).toBeUndefined();
	});
});

describe('buildResolutionHeaderData', () => {
	test('has no header for papers other than working papers', () => {
		expect(buildResolutionHeaderData(workingPaper({ type: 'POSITION_PAPER' }), conference)).toBe(
			undefined
		);
	});

	test('fills the header from the paper and the conference', () => {
		expect(buildResolutionHeaderData(workingPaper(), conference)).toEqual({
			conferenceName: 'MUN-SH',
			conferenceTitle: 'Model United Nations Schleswig-Holstein',
			committeeAbbreviation: 'GA',
			committeeFullName: 'General Assembly',
			committeeResolutionHeadline: 'Resolves',
			documentNumber: `WP/${year}/abcdef`,
			topic: 'Climate change',
			authoringDelegation: getFullTranslatedCountryNameFromISO3Code('DEU'),
			conferenceEmblem: 'data:image/png;base64,AAAA'
		});
	});

	test('falls back to the short title when there is no long one', () => {
		const header = buildResolutionHeaderData(workingPaper(), {
			title: 'MUN-SH',
			longTitle: null,
			emblemDataURL: null
		});
		expect(header?.conferenceTitle).toBe('MUN-SH');
		expect(header?.conferenceEmblem).toBeUndefined();
	});

	test('uses generic names without a conference or agenda item', () => {
		const header = buildResolutionHeaderData(
			workingPaper({
				agendaItem: null,
				delegation: {
					assignedNation: null,
					assignedNonStateActor: { name: 'Amnesty', fontAwesomeIcon: null }
				}
			}),
			undefined
		);
		expect(header).toEqual({
			conferenceName: 'Model UN',
			conferenceTitle: 'Model United Nations',
			committeeAbbreviation: undefined,
			committeeFullName: undefined,
			committeeResolutionHeadline: undefined,
			documentNumber: `WP/${year}/abcdef`,
			topic: undefined,
			authoringDelegation: 'Amnesty',
			conferenceEmblem: undefined
		});
	});

	test('leaves out a missing resolution headline', () => {
		const header = buildResolutionHeaderData(
			workingPaper({
				agendaItem: {
					title: 'Water',
					committee: { abbreviation: 'SC', name: 'Security Council', resolutionHeadline: null }
				}
			}),
			null
		);
		expect(header?.committeeResolutionHeadline).toBeUndefined();
		expect(header?.conferenceName).toBe('Model UN');
	});
});

describe('resolutionHeader', () => {
	test('prints a draft header without a committee or authoring delegation', () => {
		expect(
			resolutionHeader(conference, {
				committee: undefined,
				topic: undefined,
				authoringDelegation: undefined,
				documentNumber: 'WP/DRAFT'
			})
		).toEqual({
			conferenceName: 'MUN-SH',
			conferenceTitle: 'Model United Nations Schleswig-Holstein',
			committeeAbbreviation: undefined,
			committeeFullName: undefined,
			committeeResolutionHeadline: undefined,
			documentNumber: 'WP/DRAFT',
			topic: undefined,
			authoringDelegation: undefined,
			conferenceEmblem: 'data:image/png;base64,AAAA'
		});
	});
});

describe('loadPaperIntoEditor', () => {
	test('starts a working paper without content from an empty resolution', () => {
		expect(loadPaperIntoEditor(workingPaper(), undefined)).toEqual({
			validationError: null,
			invalidRawContent: null
		});
		expect(currentEditorContent('WORKING_PAPER')).toEqual(
			createEmptyResolution('General Assembly')
		);
	});

	test('loads a valid resolution into the resolution editor', () => {
		const resolution = createEmptyResolution('Security Council');
		expect(loadPaperIntoEditor(workingPaper({ agendaItem: null }), resolution)).toEqual({
			validationError: null,
			invalidRawContent: null
		});
		expect(currentEditorContent('WORKING_PAPER')).toEqual(resolution);
	});

	test('hands back a working paper whose content is not a resolution', () => {
		const content = { committeeName: 'General Assembly', preamble: 'not a list' };
		const { validationError, invalidRawContent } = loadPaperIntoEditor(workingPaper(), content);
		expect(validationError).toEqual(expect.any(String));
		expect(invalidRawContent).toBe(content);
		expect(currentEditorContent('WORKING_PAPER')).toEqual(
			createEmptyResolution('General Assembly')
		);
	});

	test('loads other papers into the text editor', () => {
		const content = { type: 'doc', content: [] };
		const paper = workingPaper({ type: 'POSITION_PAPER' });
		expect(loadPaperIntoEditor(paper, content)).toEqual({
			validationError: null,
			invalidRawContent: null
		});
		expect(currentEditorContent('POSITION_PAPER')).toBe(content);
		loadPaperIntoEditor(paper, undefined);
		expect(get(editorContentStore)).toBe('');
		expect(resolutionStore.snapshot).toBeDefined();
	});
});
