import { describe, expect, it } from 'vitest';
import {
	assignmentDataSchema,
	assignmentOverview,
	countDataSchema,
	countGroupingProblem,
	participantCounts,
	participantOverview,
	participantsDataSchema
} from './curatedReads';

function participant(overrides: Record<string, unknown> = {}) {
	return {
		id: 'p',
		userId: 'u',
		ofAgeAtConference: true,
		paymentStatus: 'DONE',
		termsAndConditions: 'DONE',
		guardianConsent: 'PENDING',
		mediaConsent: 'DONE',
		mediaConsentStatus: 'ALLOWED_ALL',
		didAttend: false,
		checkIssues: [],
		school: null,
		user: { city: 'Bonn', country: 'DEU' },
		delegationMember: { delegationId: 'd', isHeadDelegate: false, assignedCommitteeId: null },
		singleParticipant: null,
		conferenceSupervisor: null,
		...overrides
	};
}

describe('participantOverview', () => {
	const { conferenceParticipants: rows } = participantsDataSchema.parse({
		conferenceParticipants: [
			participant({ id: 'p1', paymentStatus: 'PROBLEM', checkIssues: ['paymentOpen'] }),
			participant({ id: 'p2', ofAgeAtConference: false }),
			participant({
				id: 'p3',
				delegationMember: null,
				conferenceSupervisor: { id: 's', plansOwnAttendenceAtConference: true }
			}),
			participant({ id: 'p4', delegationMember: null })
		]
	});

	it('sums up the registered participants', () => {
		const { summary } = participantOverview({ rows, filter: {}, offset: 0, limit: 10 });
		expect(summary.registered).toBe(3);
		expect(summary.byKind).toEqual({ DELEGATE: 2, SUPERVISOR: 1, NONE: 1 });
		expect(summary.paymentStatus).toEqual({ PROBLEM: 1, DONE: 2 });
		expect(summary.minors).toBe(1);
		expect(summary.guardianConsentOfMinors).toEqual({ PENDING: 1 });
		expect(summary.withCheckIssues).toBe(1);
	});

	it('filters and pages', () => {
		const filtered = participantOverview({
			rows,
			filter: { paymentStatus: 'PROBLEM' },
			offset: 0,
			limit: 10
		});
		expect(filtered.matching).toBe(1);
		expect(filtered.participants.map((row) => row.participantId)).toEqual(['p1']);

		const page = participantOverview({ rows, filter: {}, offset: 1, limit: 2 });
		expect(page.participants.map((row) => row.participantId)).toEqual(['p2', 'p3']);
		expect(page.participants[0]?.minor).toBe(true);
	});
});

describe('participantCounts', () => {
	function countRow(gender: string | null, minor = false) {
		return {
			ofAgeAtConference: !minor,
			paymentStatus: 'DONE',
			termsAndConditions: 'DONE',
			guardianConsent: 'DONE',
			mediaConsent: 'DONE',
			didAttend: false,
			school: { name: 'Schule' },
			user: { city: 'Bonn', country: 'DEU', gender, foodPreference: null },
			delegationMember: { assignedCommitteeId: null, delegation: { assignedRoleId: null } },
			singleParticipant: null,
			conferenceSupervisor: null
		};
	}
	const { conferenceParticipants: rows } = countDataSchema.parse({
		conferenceParticipants: [
			...Array.from({ length: 6 }, () => countRow('FEMALE')),
			...Array.from({ length: 2 }, () => countRow('DIVERSE', true)),
			countRow(null, true)
		]
	});

	it('leaves out groups of fewer than five when grouped by a redacted attribute', () => {
		expect(participantCounts({ rows, groupBy: ['gender'] })).toEqual({
			total: 9,
			groups: [{ gender: 'FEMALE', count: 6 }],
			// DIVERSE (2) and unknown (1) together, still too few to say
			suppressed: '<5'
		});
		expect(participantCounts({ rows, groupBy: ['gender', 'minor'] }).suppressed).toBe('<5');
	});

	it('counts exactly by attributes that are visible per person', () => {
		expect(participantCounts({ rows, groupBy: ['minor'] })).toEqual({
			total: 9,
			groups: [
				{ minor: 'false', count: 6 },
				{ minor: 'true', count: 3 }
			]
		});
	});
});

describe('countGroupingProblem', () => {
	it('refuses a redacted dimension next to any dimension an assistant reads per person', () => {
		expect(countGroupingProblem(['gender', 'school'])).toMatch(/gender/);
		expect(countGroupingProblem(['foodPreference', 'committeeId'])).toMatch(/committeeId/);
		// six women, five of them paid: the one who has not is named by participant_overview
		expect(countGroupingProblem(['gender', 'paymentStatus'])).toMatch(/paymentStatus/);
		expect(countGroupingProblem(['foodPreference', 'kind', 'minor'])).toMatch(/kind, minor/);
	});

	it('counts redacted dimensions alone or together, and the others freely', () => {
		expect(countGroupingProblem(['gender'])).toBeUndefined();
		expect(countGroupingProblem(['gender', 'foodPreference'])).toBeUndefined();
		expect(countGroupingProblem(['school', 'city', 'paymentStatus'])).toBeUndefined();
	});
});

describe('assignmentOverview', () => {
	const data = assignmentDataSchema.parse({
		conference: {
			state: 'PREPARATION',
			assignmentReleased: false,
			maxCollectiveGroupSize: 16,
			maxGuaranteedSeatsPerForeignSchool: 12
		},
		committees: [
			{ id: 'ga', abbreviation: 'GA', numOfSeatsPerDelegation: 2, roles: [{ id: 'deu' }] },
			{ id: 'sc', abbreviation: 'SC', numOfSeatsPerDelegation: 1, roles: [{ id: 'deu' }] }
		],
		conferenceRoles: [
			{
				id: 'deu',
				kind: 'NATION',
				name: null,
				abbreviation: null,
				nationAlpha3Code: 'DEU',
				seatAmount: null
			},
			{
				id: 'press',
				kind: 'CUSTOM',
				name: 'Press',
				abbreviation: null,
				nationAlpha3Code: null,
				seatAmount: 1
			}
		],
		delegations: [
			{
				id: 'd1',
				memberCount: 4,
				assignedRoleId: 'deu',
				appliedForRoles: [
					{ roleId: 'deu', rank: 2 },
					{ roleId: 'fra', rank: 1 }
				],
				assignmentReview: null
			},
			{
				id: 'd2',
				memberCount: 3,
				assignedRoleId: null,
				appliedForRoles: [],
				assignmentReview: { evaluation: 5, flagged: false, disqualified: false, required: true }
			}
		],
		singleParticipants: [
			{
				id: 's1',
				assignedRoleId: null,
				appliedForRoles: [{ id: 'press' }],
				assignmentReview: { evaluation: 3, flagged: false, disqualified: false, required: true }
			}
		],
		assignmentUnits: [],
		assignmentSingleRoles: [{ roleId: 'press', singleParticipantId: 's1' }]
	});

	it('counts seats and holders per role and lists what needs attention', () => {
		const overview = assignmentOverview({ data, offset: 0, limit: 10 });
		expect(overview.roles).toEqual([
			{ roleId: 'deu', kind: 'NATION', name: 'DEU', nationAlpha3Code: 'DEU', seats: 3, held: 4 },
			{ roleId: 'press', kind: 'CUSTOM', name: 'Press', nationAlpha3Code: null, seats: 1, held: 0 }
		]);
		expect(overview.attention).toEqual({
			// s1 has a planned role in the draft, so only d2 is left without a seat
			requiredWithoutSeat: [{ delegationId: 'd2' }],
			overfilledRoles: ['deu']
		});
		expect(overview.delegations[0]?.wishes).toEqual(['fra', 'deu']);
	});

	it('pages the applications', () => {
		const overview = assignmentOverview({ data, offset: 1, limit: 1 });
		expect(overview.delegations.map((delegation) => delegation.delegationId)).toEqual(['d2']);
		expect(overview.singleParticipants).toEqual([]);
	});
});
