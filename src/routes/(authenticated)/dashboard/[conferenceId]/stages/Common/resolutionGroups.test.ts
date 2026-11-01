import { groupResolutionsByCommittee } from './resolutionGroups';
import { describe, expect, test } from 'vitest';

describe('groupResolutionsByCommittee', () => {
	const ga = { id: 'ga', name: 'General Assembly', abbreviation: 'GA' };
	const sc = { id: 'sc', name: 'Security Council', abbreviation: 'SC' };

	test('groups by committee, keeps first-seen order and puts untagged last', () => {
		const groups = groupResolutionsByCommittee([
			{ id: '1', committee: null },
			{ id: '2', committee: sc },
			{ id: '3', committee: ga },
			{ id: '4', committee: sc }
		]);
		expect(groups.map((g) => [g.committeeName, g.items.map((r) => r.id)])).toEqual([
			['Security Council (SC)', ['2', '4']],
			['General Assembly (GA)', ['3']],
			[null, ['1']]
		]);
	});

	test('returns no groups for no or missing resolutions', () => {
		expect(groupResolutionsByCommittee([])).toEqual([]);
		expect(groupResolutionsByCommittee(undefined)).toEqual([]);
	});
});
