import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
const schoolPubsub = { created: vi.fn() };
vi.mock('#api/pubsub', () => ({ schoolPubsub }));

const { countSchoolParticipations, resolveSchoolChoice } = await import('./schoolService');
const { db } = await import('#api/db/db');

describe('countSchoolParticipations', () => {
	/** Answers the count query with `rows`; `asked` counts the queries. */
	function fakeCounts(rows: { school_id: string; value: number }[]) {
		const asked = { count: 0 };
		Object.assign(db, {
			execute: async () => {
				asked.count++;
				return { rows };
			}
		});
		return asked;
	}

	it('counts each school by the conferences it took part in', async () => {
		fakeCounts([{ school_id: 'a', value: 3 }]);
		expect(await countSchoolParticipations(['a', 'b'])).toEqual(
			new Map([
				['a', 3],
				['b', 0]
			])
		);
	});

	it('asks nothing for no schools', async () => {
		const asked = fakeCounts([]);
		expect(await countSchoolParticipations([])).toEqual(new Map());
		expect(asked.count).toBe(0);
	});
});

describe('resolveSchoolChoice', () => {
	/**
	 * A database holding the schools `ids` (looked up by id) and `named` (found by name); new
	 * schools get the id `new`. `inserted` records the names created.
	 */
	function fakeSchools({ ids = [], named }: { ids?: string[]; named?: string }) {
		const inserted: unknown[] = [];
		const chain = {
			from: () => chain,
			where: () => chain,
			orderBy: () => chain,
			limit: async () => (named ? [{ id: named }] : [])
		};
		Object.assign(db, {
			query: {
				school: {
					findFirst: async ({ where }: { where: { id: string } }) =>
						ids.includes(where.id) ? { id: where.id } : undefined
				}
			},
			select: () => chain,
			insert: () => ({
				values: (values: unknown) => {
					inserted.push(values);
					return { returning: async () => [{ id: 'new' }] };
				}
			})
		});
		return inserted;
	}

	it('takes a school chosen by id, and refuses one that does not exist', async () => {
		fakeSchools({ ids: ['s1'] });
		expect(await resolveSchoolChoice({ choice: { schoolId: 's1' } })).toBe('s1');
		await expect(resolveSchoolChoice({ choice: { schoolId: 'gone' } })).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' }
		});
	});

	it('finds a typed school by its name before creating one', async () => {
		const inserted = fakeSchools({ named: 's2' });
		expect(await resolveSchoolChoice({ choice: { schoolName: 'Gymnasium' } })).toBe('s2');
		expect(inserted).toEqual([]);
	});

	it('creates a typed school no one named yet, its name cleaned, and announces it', async () => {
		schoolPubsub.created.mockClear();
		const inserted = fakeSchools({});
		expect(await resolveSchoolChoice({ choice: { schoolName: '  Neue   Schule ' } })).toBe('new');
		expect(inserted).toEqual([{ name: 'Neue Schule' }]);
		expect(schoolPubsub.created).toHaveBeenCalled();
	});

	it('names no school for a blank name or a null, and keeps it when both are left out', async () => {
		fakeSchools({});
		expect(await resolveSchoolChoice({ choice: { schoolName: '   ' } })).toBeNull();
		expect(await resolveSchoolChoice({ choice: { schoolId: null } })).toBeNull();
		expect(await resolveSchoolChoice({ choice: { schoolName: null } })).toBeNull();
		expect(await resolveSchoolChoice({ choice: {} })).toBeUndefined();
	});
});
