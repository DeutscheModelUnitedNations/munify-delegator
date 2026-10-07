import { describe, expect, test, vi } from 'vitest';

vi.mock('$lib/api/rumbleClient/client', () => ({ client: {} }));
vi.mock('$lib/utils/nationTranslationHelper.svelte', () => ({
	nationCodesMatching: (word: string) => (word === 'deutsch' ? ['DEU'] : [])
}));

const { delegationsWhere } = await import('./delegationsQuery');

describe('delegationsWhere', () => {
	test('without search or filters only the conference is filtered', () => {
		expect(delegationsWhere('c1', '', [])).toEqual({ conferenceId: { eq: 'c1' } });
	});

	test('the column filters become conditions', () => {
		const where = delegationsWhere('c1', '', [
			{ id: 'applied', value: false },
			{ id: 'school', value: { mode: 'equals', value: 'Gymnasium' } },
			{ id: 'entryCode', value: { mode: 'startsWith', value: 'AB' } }
		]);
		expect(where).toEqual({
			conferenceId: { eq: 'c1' },
			applied: { eq: false },
			school: { eq: 'Gymnasium' },
			entryCode: { ilike: 'AB%' }
		});
	});

	test('filters it cannot read are left out', () => {
		const where = delegationsWhere('c1', '', [
			{ id: 'applied', value: 'yes' },
			{ id: 'school', value: { mode: 'contains', value: '' } }
		]);
		expect(where).toEqual({ conferenceId: { eq: 'c1' } });
	});

	test('every search word has to match somewhere', () => {
		const where = delegationsWhere('c1', 'gym xyzq', []);
		expect(where.AND).toHaveLength(2);
		const [first, second] = where.AND ?? [];
		expect(first.OR).toContainEqual({ school: { ilike: '%gym%' } });
		// a word naming no nation does not ask for one
		expect(second.OR?.some((condition) => 'assignedNationAlpha3Code' in condition)).toBe(false);
	});

	test('a word naming a nation asks for its code', () => {
		const [word] = delegationsWhere('c1', 'deutsch', []).AND ?? [];
		expect(word.OR).toContainEqual({
			assignedNationAlpha3Code: { in: ['DEU'] }
		});
	});
});
