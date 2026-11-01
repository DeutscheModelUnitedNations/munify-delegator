import { describe, expect, test } from 'vitest';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type { PaperDelegationRole } from './paperDisplay';
import { groupPapersByDelegation } from './supervisedPapers';

interface Delegation {
	id: string;
	assignedRole: PaperDelegationRole | null;
}

const germany: Delegation = {
	id: 'deu',
	assignedRole: {
		kind: 'NATION',
		name: null,
		fontAwesomeIcon: null,
		nation: { alpha2Code: 'de', alpha3Code: 'DEU' }
	}
};
const amnesty: Delegation = {
	id: 'ai',
	assignedRole: {
		kind: 'NON_STATE_ACTOR',
		name: 'Amnesty',
		fontAwesomeIcon: 'candle',
		nation: null
	}
};
const nobody: Delegation = { id: 'x', assignedRole: null };

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
