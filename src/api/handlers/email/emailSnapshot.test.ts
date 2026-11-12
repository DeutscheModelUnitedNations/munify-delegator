import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));
// the link's configuration reads the environment, which tests do not set
vi.mock('#api/handlers/chaseLink/linkAuth', () => ({ linkConfig: () => undefined }));

const { delegationPart, nextCursor, partsFor, reviewPart } = await import('./emailSnapshot');

const germany = {
	id: 'r1',
	kind: 'NATION' as const,
	name: null,
	nationAlpha3Code: 'DEU'
};

describe('delegationPart', () => {
	const joinedAt = new Date('2026-10-01T10:00:00Z');
	const membership = { isHeadDelegate: true, createdAt: joinedAt };
	const delegation = { id: 'd1', entryCode: 'ABCDEFGH' };
	const asRead = { id: 'd1', entryCode: 'ABCDEFGH', isHeadDelegate: true, joinedAt };

	test('is nothing outside a delegation', () => {
		expect(delegationPart(undefined)).toBeNull();
		expect(delegationPart(null)).toBeNull();
		expect(delegationPart({ ...membership, delegation: null })).toBeNull();
	});

	test('reads the application, the role and the committee of a member', () => {
		expect(
			delegationPart({
				...membership,
				delegation: { ...delegation, applied: true, assignedRole: germany },
				assignedCommittee: { id: 'c-ga', abbreviation: 'GA' }
			})
		).toEqual({ ...asRead, applied: true, role: germany, committee: 'GA', committeeId: 'c-ga' });
	});

	test('a member without a role or committee has none', () => {
		expect(
			delegationPart({ ...membership, delegation: { ...delegation, applied: false } })
		).toEqual({ ...asRead, applied: false, role: null, committee: null, committeeId: null });
		expect(
			delegationPart({
				...membership,
				delegation: { ...delegation, applied: true, assignedRole: null },
				assignedCommittee: null
			})
		).toEqual({ ...asRead, applied: true, role: null, committee: null, committeeId: null });
	});
});

describe('reviewPart', () => {
	const paper = {
		id: 'paper-1',
		type: 'WORKING_PAPER' as const,
		authorParticipantId: 'p1',
		agendaItem: { title: 'Klimaschutz', committee: { abbreviation: 'GV' } }
	};
	const reviewer = { givenName: 'Robin', familyName: 'Reviewer', email: 'robin@example.org' };

	test('reads the paper, its agenda item, the reviewer and the new status', () => {
		expect(
			reviewPart({ id: 'r1', statusAfter: 'ACCEPTED', reviewer, paperVersion: { paper } })
		).toEqual([
			{
				id: 'r1',
				authorParticipantId: 'p1',
				paperId: 'paper-1',
				paperType: 'WORKING_PAPER',
				agendaItem: 'GV: Klimaschutz',
				reviewer: { name: 'Robin Reviewer', email: 'robin@example.org' },
				statusAfter: 'ACCEPTED'
			}
		]);
	});

	test('a paper outside an agenda item has none', () => {
		const [review] = reviewPart({
			id: 'r1',
			statusAfter: null,
			reviewer: null,
			paperVersion: { paper: { ...paper, agendaItem: null } }
		});
		expect(review?.agendaItem).toBeNull();
		expect(review?.reviewer).toBeNull();
	});

	test('is nothing for a paper without an author', () => {
		expect(
			reviewPart({
				id: 'r1',
				statusAfter: 'ACCEPTED',
				reviewer,
				paperVersion: { paper: { ...paper, authorParticipantId: null } }
			})
		).toEqual([]);
		expect(reviewPart({ id: 'r1', statusAfter: 'ACCEPTED', reviewer, paperVersion: null })).toEqual(
			[]
		);
	});
});

describe('paging', () => {
	const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `id-${i}` }));
	const every = new Set(['people', 'waitingList', 'team'] as const);

	test('reads only the parts the kinds need', () => {
		expect([...partsFor(new Set(['PAYMENT_UNLOCKED', 'PAPER_REVIEWED']))]).toEqual(['people']);
		expect([...partsFor(new Set(['WAITING_LIST_REGISTERED', 'TEAM_WELCOME']))]).toEqual([
			'waitingList',
			'team'
		]);
	});

	test('goes on after the last row of a full page', () => {
		expect(
			nextCursor({ cursor: { part: 'people', after: null }, rows: rows(3), size: 3, parts: every })
		).toEqual({ part: 'people', after: 'id-2' });
	});

	test('moves to the next part needed once a part runs out, and ends after the last', () => {
		const people = { part: 'people' as const, after: 'x' };
		expect(nextCursor({ cursor: people, rows: rows(2), size: 3, parts: every })).toEqual({
			part: 'waitingList',
			after: null
		});
		expect(
			nextCursor({ cursor: people, rows: [], size: 3, parts: new Set(['people', 'team'] as const) })
		).toEqual({ part: 'team', after: null });
		expect(
			nextCursor({ cursor: { part: 'team', after: null }, rows: rows(1), size: 3, parts: every })
		).toBeNull();
	});
});
