// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));

import {
	countAudience,
	participantFacts,
	participantSubjects,
	type ParticipantFacts,
	type ParticipantRow
} from './audienceSubjects';

const startConference = new Date('2027-03-01T08:00:00Z');

const participant = (overrides: Partial<ParticipantFacts> & { id: string }): ParticipantFacts => ({
	userId: `user-${overrides.id}`,
	birthday: new Date('2000-01-01'),
	paymentStatus: 'PENDING',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	delegation: null,
	single: null,
	supervisor: null,
	surveyOptionIds: [],
	...overrides
});

const subjects = (participants: ParticipantFacts[], assignmentReleased = true) =>
	new Map(
		participantSubjects({ participants, conference: { assignmentReleased, startConference } }).map(
			(person) => [person.participantId, person.subject]
		)
	);

describe('participantSubjects', () => {
	const delegate = participant({ id: 'd', delegation: { roleId: 'fra', committeeId: 'ga' } });

	test('a seated delegate has their role and committee once the assignment is released', () => {
		expect(subjects([delegate]).get('d')).toMatchObject({
			part: 'DELEGATE',
			seated: true,
			roleId: 'fra',
			committeeId: 'ga',
			paymentOpen: true,
			paperworkOpen: true,
			ofAge: true
		});
	});

	test('before the release nobody holds a seat, so no announcement can tell', () => {
		expect(subjects([delegate], false).get('d')).toMatchObject({
			seated: false,
			roleId: null,
			committeeId: null,
			paymentOpen: false,
			paperworkOpen: false
		});
	});

	test('finished paperwork is not open, and a minor needs the guardian consent too', () => {
		const done = {
			termsAndConditions: 'DONE',
			mediaConsent: 'DONE',
			paymentStatus: 'DONE'
		} as const;
		const adult = participant({ id: 'a', single: { roleId: 'press' }, ...done });
		const minor = participant({
			id: 'm',
			single: { roleId: 'press' },
			birthday: new Date('2012-06-01'),
			...done
		});
		const all = subjects([adult, minor]);
		expect(all.get('a')).toMatchObject({
			part: 'SINGLE',
			paymentOpen: false,
			paperworkOpen: false
		});
		expect(all.get('m')).toMatchObject({ ofAge: false, paperworkOpen: true });
	});

	test('a supervisor is seated when they come along and a student holds a seat', () => {
		const supervisor = (plansOwnAttendance: boolean, studentSeated: boolean) =>
			subjects([participant({ id: 's', supervisor: { plansOwnAttendance, studentSeated } })]).get(
				's'
			);
		expect(supervisor(true, true)).toMatchObject({ part: 'SUPERVISOR', seated: true });
		expect(supervisor(true, false)?.seated).toBe(false);
		expect(supervisor(false, true)?.seated).toBe(false);
	});

	test('a participant row without a registration is nobody, one without a birthday has no age', () => {
		const all = subjects([
			participant({ id: 'gone' }),
			participant({ id: 'x', single: { roleId: null }, birthday: null })
		]);
		expect(all.has('gone')).toBe(false);
		expect(all.get('x')).toMatchObject({ seated: false, ofAge: null });
	});
});

describe('countAudience', () => {
	const people = participantSubjects({
		conference: { assignmentReleased: true, startConference },
		participants: [
			participant({ id: 'd1', delegation: { roleId: 'fra', committeeId: 'ga' } }),
			participant({ id: 'd2', delegation: { roleId: 'usa', committeeId: 'sc' } }),
			participant({ id: 's1', single: { roleId: 'press' } }),
			participant({ id: 'v1', supervisor: { plansOwnAttendance: true, studentSeated: true } })
		]
	});

	test('counts each person once, by how they take part', () => {
		expect(
			countAudience({
				people,
				audiences: [
					{ kind: 'SUPERVISORS' },
					{ kind: 'COMMITTEE', committeeId: 'ga' },
					{ kind: 'SEATED' }
				]
			})
		).toEqual({
			total: 4,
			delegates: 2,
			singleParticipants: 1,
			supervisors: 1,
			waitingList: 0,
			team: 0
		});
		expect(
			countAudience({ people, audiences: [{ kind: 'COMMITTEE', committeeId: 'ga' }] }).total
		).toBe(1);
		expect(countAudience({ people, audiences: [{ kind: 'TEAM' }] }).total).toBe(0);
	});
});

describe('participantFacts', () => {
	const row = (overrides: Partial<ParticipantRow> = {}): ParticipantRow => ({
		id: 'p1',
		userId: 'u1',
		paymentStatus: 'DONE',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		user: { birthday: null },
		delegationMember: null,
		singleParticipant: null,
		conferenceSupervisor: null,
		...overrides
	});

	test("a delegate brings their delegation's role and their own committee", () => {
		expect(
			participantFacts({
				row: row({
					delegationMember: { assignedCommitteeId: 'ga', delegation: { assignedRoleId: 'fra' } }
				}),
				surveyOptionIds: ['bus']
			})
		).toMatchObject({
			delegation: { roleId: 'fra', committeeId: 'ga' },
			single: null,
			supervisor: null,
			surveyOptionIds: ['bus'],
			paymentStatus: 'DONE'
		});
	});

	test('a single participant brings their role', () => {
		expect(
			participantFacts({
				row: row({ singleParticipant: { assignedRoleId: 'press' } }),
				surveyOptionIds: []
			}).single
		).toEqual({ roleId: 'press' });
	});

	test('a supervisor has a seated student once one of them holds a role, either way', () => {
		const supervisor = (
			supervised: NonNullable<ParticipantRow['conferenceSupervisor']>['supervised']
		) =>
			participantFacts({
				row: row({ conferenceSupervisor: { plansOwnAttendenceAtConference: true, supervised } }),
				surveyOptionIds: []
			}).supervisor;
		const unseated = {
			delegationMember: { delegation: { assignedRoleId: null } },
			singleParticipant: null
		};
		expect(supervisor([unseated])).toEqual({ plansOwnAttendance: true, studentSeated: false });
		expect(
			supervisor([
				unseated,
				{ delegationMember: { delegation: { assignedRoleId: 'fra' } }, singleParticipant: null }
			])?.studentSeated
		).toBe(true);
		expect(
			supervisor([{ delegationMember: null, singleParticipant: { assignedRoleId: 'press' } }])
				?.studentSeated
		).toBe(true);
		expect(supervisor([])?.studentSeated).toBe(false);
	});
});
