import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db.js', () => ({ db: {} }));

const { delegationPart, reviewPart } = await import('./emailSnapshot');

const germany = { id: 'r1', kind: 'NATION' as const, name: null, nationAlpha3Code: 'DEU' };

describe('delegationPart', () => {
	test('is nothing outside a delegation', () => {
		expect(delegationPart(undefined)).toBeNull();
		expect(delegationPart(null)).toBeNull();
		expect(delegationPart({ delegation: null })).toBeNull();
	});

	test('reads the application, the role and the committee of a member', () => {
		expect(
			delegationPart({
				delegation: { applied: true, assignedRole: germany },
				assignedCommittee: { abbreviation: 'GA' }
			})
		).toEqual({ applied: true, role: germany, committee: 'GA' });
	});

	test('a member without a role or committee has none', () => {
		expect(delegationPart({ delegation: { applied: false } })).toEqual({
			applied: false,
			role: null,
			committee: null
		});
		expect(
			delegationPart({ delegation: { applied: true, assignedRole: null }, assignedCommittee: null })
		).toEqual({ applied: true, role: null, committee: null });
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
