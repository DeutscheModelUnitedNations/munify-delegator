import { describe, expect, it, vi } from 'vitest';
import { seatedFrom } from './board';

vi.mock('$lib/api/rumbleClient/client', () => ({ client: {} }));

const review = (id: string) => ({
	delegationId: id,
	singleParticipantId: null,
	evaluation: 3,
	flagged: false,
	disqualified: false,
	note: null
});
const delegation = (id: string, applied = true, rated = false) => ({
	id,
	applied,
	school: null,
	assignedNationAlpha3Code: null,
	assignedNonStateActorId: null,
	members: [],
	appliedForRoles: [],
	assignmentReview: rated ? review(id) : null
});
const single = (id: string, applied = true) => ({
	id,
	applied,
	school: null,
	assignedRoleId: null,
	user: { givenName: 'A', familyName: 'B' },
	appliedForRoles: [],
	assignmentReview: null
});

describe('seatedFrom', () => {
	it('joins the seated applications with those the draft brings along, each once', () => {
		const result = seatedFrom({
			delegations: [delegation('seated', true, true)],
			singleParticipants: [single('holder')],
			units: [
				{ sourceDelegation: delegation('moved', true, true), sourceSingleParticipant: null },
				{ sourceDelegation: delegation('seated'), sourceSingleParticipant: null },
				{ sourceDelegation: null, sourceSingleParticipant: single('converted') }
			],
			draftSingleRoles: [
				{ singleParticipant: single('planned') },
				{ singleParticipant: single('holder') }
			]
		});
		expect(result.delegations.map((row) => row.id)).toEqual(['seated', 'moved']);
		expect(result.singleParticipants.map((row) => row.id)).toEqual([
			'holder',
			'converted',
			'planned'
		]);
		expect(result.reviews.map((row) => row.delegationId)).toEqual(['seated', 'moved']);
	});

	it('leaves out applications no longer applied', () => {
		const result = seatedFrom({
			delegations: [],
			singleParticipants: [],
			units: [
				{ sourceDelegation: delegation('withdrawn', false, true), sourceSingleParticipant: null }
			],
			draftSingleRoles: [{ singleParticipant: single('gone', false) }]
		});
		expect(result).toEqual({ delegations: [], singleParticipants: [], reviews: [] });
	});
});
