import { describe, expect, test } from 'vitest';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { groupPapersByDelegation } from './supervisedPapers';

const germany = {
	id: 'deu',
	assignedNation: { alpha2Code: 'de', alpha3Code: 'DEU' },
	assignedNonStateActor: null
};
const amnesty = {
	id: 'ai',
	assignedNation: null,
	assignedNonStateActor: { name: 'Amnesty', fontAwesomeIcon: 'candle' }
};
const nobody = { id: 'x', assignedNation: null, assignedNonStateActor: null };

describe('groupPapersByDelegation', () => {
	test('is empty without papers', () => {
		expect(groupPapersByDelegation([])).toEqual([]);
	});

	test('groups papers by delegation, sorted by name', () => {
		const papers = [
			{ id: 'p1', delegation: germany },
			{ id: 'p2', delegation: amnesty },
			{ id: 'p3', delegation: germany },
			{ id: 'p4', delegation: nobody }
		];
		const groups = groupPapersByDelegation(papers);

		const germanyName = getFullTranslatedCountryNameFromISO3Code('DEU');
		expect(groups.map((g) => g.delegationName)).toEqual(
			['Amnesty', germanyName, 'Unknown'].sort((a, b) => a.localeCompare(b))
		);
		expect(groups.find((g) => g.delegationId === 'deu')).toEqual({
			delegationId: 'deu',
			delegationName: germanyName,
			alpha2Code: 'de',
			nsa: false,
			icon: undefined,
			papers: [papers[0], papers[2]]
		});
		expect(groups.find((g) => g.delegationId === 'ai')).toEqual({
			delegationId: 'ai',
			delegationName: 'Amnesty',
			alpha2Code: undefined,
			nsa: true,
			icon: 'candle',
			papers: [papers[1]]
		});
		expect(groups.find((g) => g.delegationId === 'x')?.nsa).toBe(false);
	});
});
