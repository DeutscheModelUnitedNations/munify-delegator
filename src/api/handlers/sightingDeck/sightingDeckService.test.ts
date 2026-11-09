import { describe, expect, it, vi } from 'vitest';
import codenmz from '#lib/helpers/codenamize';

vi.mock('#api/db/db', () => ({ db: {} }));

const { nameMatches } = await import('./sightingDeckService');

describe('nameMatches', () => {
	const ids = Array.from({ length: 80 }, (_, i) => `id-${String(i).padStart(3, '0')}`);

	it('matches the id or the codename worked out from it', () => {
		expect(nameMatches({ ids, term: 'id-007' })).toEqual([{ id: 'id-007' }]);
		const codename = codenmz('id-042').toLowerCase();
		expect(nameMatches({ ids, term: codename })).toContainEqual({ id: 'id-042' });
		expect(nameMatches({ ids, term: 'nothing like it' })).toEqual([]);
	});

	it('answers at most 50', () => {
		expect(nameMatches({ ids, term: 'id-' })).toHaveLength(50);
	});
});
