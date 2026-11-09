import { describe, expect, it } from 'vitest';
import { reconcileLinks, type LinkPair } from './sameLinks';

function pair(
	userId: string,
	candidateId: string,
	{ status = 'OPEN', inferred = false, reasons = ['name'] }: Partial<LinkPair> = {}
): LinkPair {
	return { id: `${userId}${candidateId}`, userId, candidateId, status, inferred, reasons };
}

describe('reconcileLinks', () => {
	it('changes nothing for a lone confirmed pair', () => {
		expect(reconcileLinks([pair('a', 'b', { status: 'CONFIRMED' })])).toEqual({
			confirm: [],
			reopen: [],
			remove: [],
			insert: [],
			conflicts: []
		});
	});

	it('links the ends of a chain of confirmations', () => {
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED' }),
			pair('b', 'c', { status: 'CONFIRMED' })
		]);
		expect(changes.insert).toEqual([{ userId: 'a', candidateId: 'c' }]);
	});

	it('links every account of a longer chain with every other one', () => {
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED' }),
			pair('c', 'd', { status: 'CONFIRMED' }),
			pair('b', 'c', { status: 'CONFIRMED' })
		]);
		expect(changes.insert).toEqual([
			{ userId: 'a', candidateId: 'c' },
			{ userId: 'a', candidateId: 'd' },
			{ userId: 'b', candidateId: 'd' }
		]);
	});

	it('confirms an open pair within one person instead of adding one', () => {
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED' }),
			pair('b', 'c', { status: 'CONFIRMED' }),
			pair('a', 'c')
		]);
		expect(changes.confirm).toEqual(['ac']);
		expect(changes.insert).toEqual([]);
	});

	it('reports a dismissed pair within one person as a conflict', () => {
		const dismissed = pair('a', 'c', { status: 'DISMISSED' });
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED' }),
			pair('b', 'c', { status: 'CONFIRMED' }),
			dismissed
		]);
		expect(changes.conflicts).toEqual([dismissed]);
	});

	it('takes back what a reopened confirmation implied', () => {
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED' }),
			pair('b', 'c'),
			pair('a', 'c', { status: 'CONFIRMED', inferred: true, reasons: [] }),
			pair('b', 'd', { status: 'CONFIRMED', inferred: true, reasons: ['name'] })
		]);
		// a-c only came from the links; b-d was found by the matcher and goes back to open
		expect(changes.remove).toEqual(['ac']);
		expect(changes.reopen).toEqual(['bd']);
	});

	it('keeps an inferred pair another chain still implies', () => {
		const changes = reconcileLinks([
			pair('a', 'b', { status: 'DISMISSED' }),
			pair('a', 'c', { status: 'CONFIRMED' }),
			pair('c', 'b', { status: 'CONFIRMED' })
		]);
		expect(changes.conflicts.map((p) => p.id)).toEqual(['ab']);

		const kept = reconcileLinks([
			pair('a', 'b', { status: 'CONFIRMED', inferred: true, reasons: [] }),
			pair('a', 'c', { status: 'CONFIRMED' }),
			pair('b', 'c', { status: 'CONFIRMED' })
		]);
		expect(kept.remove).toEqual([]);
		expect(kept.reopen).toEqual([]);
	});
});
