import { describe, expect, test } from 'vitest';
import { transformParticipants, type QueryData } from './dataTransform';

type User = QueryData['delegationMembers'][number]['user'];
type Status = QueryData['participantStatuses'][number];

function user(id: string, overrides: Partial<User> = {}): User {
	return {
		id,
		givenName: `Given ${id}`,
		familyName: `Family ${id}`,
		email: `${id}@example.org`,
		phone: null,
		birthday: null,
		gender: null,
		pronouns: null,
		foodPreference: null,
		city: null,
		country: null,
		conferenceParticipationsCount: 0,
		...overrides
	};
}

function status(userId: string, overrides: Partial<Status> = {}): Status {
	return {
		user: { id: userId },
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		didAttend: false,
		assignedDocumentNumber: null,
		accessCardId: null,
		...overrides
	};
}

const empty: QueryData = {
	delegationMembers: [],
	conferenceSupervisors: [],
	singleParticipants: [],
	teamMembers: [],
	participantStatuses: []
};

const start = new Date('2026-03-12T09:00:00Z');
const end = new Date('2026-03-15T18:00:00Z');

describe('transformParticipants', () => {
	test('maps a delegation member with a nation and committee', () => {
		const [row] = transformParticipants(
			{
				...empty,
				delegationMembers: [
					{
						isHeadDelegate: true,
						assignedCommittee: { name: 'GA' },
						delegation: {
							school: 'Gymnasium',
							assignedNation: { alpha2Code: 'de', alpha3Code: 'deu' },
							assignedNonStateActor: null
						},
						user: user('a', { phone: '123', conferenceParticipationsCount: 3 })
					}
				]
			},
			start,
			end
		);
		expect(row).toMatchObject({
			userId: 'a',
			role: 'DELEGATION_MEMBER',
			nationAlpha2Code: 'de',
			nationAlpha3Code: 'deu',
			nsaName: null,
			nsaIcon: null,
			committee: 'GA',
			delegationSchool: 'Gymnasium',
			isHeadDelegate: true,
			accepted: true,
			phone: '123',
			participationCount: 3,
			paymentStatus: 'PENDING',
			postalRegistrationStatus: 'PENDING',
			didAttend: null,
			documentNumber: null,
			ageAtConference: null,
			hasBirthdayDuringConference: false
		});
	});

	test('maps a delegation member with a non-state actor and without a committee', () => {
		const [row] = transformParticipants(
			{
				...empty,
				delegationMembers: [
					{
						isHeadDelegate: false,
						assignedCommittee: null,
						delegation: {
							school: null,
							assignedNation: null,
							assignedNonStateActor: { name: 'Greenpeace', fontAwesomeIcon: 'leaf' }
						},
						user: user('b')
					}
				]
			},
			start,
			end
		);
		expect(row).toMatchObject({
			nationAlpha2Code: null,
			nsaName: 'Greenpeace',
			nsaIcon: 'leaf',
			committee: null,
			delegationSchool: null,
			accepted: true,
			participationCount: 0
		});
	});

	test('a delegation member without an assignment is not accepted', () => {
		const [row] = transformParticipants(
			{
				...empty,
				delegationMembers: [
					{
						isHeadDelegate: false,
						assignedCommittee: null,
						delegation: { school: null, assignedNation: null, assignedNonStateActor: null },
						user: user('c')
					}
				]
			},
			start,
			end
		);
		expect(row.accepted).toBe(false);
	});

	test('a supervisor is accepted when anyone they supervise has an assignment', () => {
		const supervisor = (
			delegations: QueryData['conferenceSupervisors'][number]['supervisedDelegationMembers'],
			singles: QueryData['conferenceSupervisors'][number]['supervisedSingleParticipants']
		) =>
			transformParticipants(
				{
					...empty,
					conferenceSupervisors: [
						{
							plansOwnAttendenceAtConference: true,
							supervisedDelegationMembers: delegations,
							supervisedSingleParticipants: singles,
							user: user('s')
						}
					]
				},
				start,
				end
			)[0];

		expect(supervisor([], [])).toMatchObject({
			role: 'SUPERVISOR',
			plansOwnAttendance: true,
			accepted: false
		});
		expect(
			supervisor(
				[{ delegation: { assignedNation: { alpha3Code: 'deu' }, assignedNonStateActor: null } }],
				[]
			).accepted
		).toBe(true);
		expect(
			supervisor([{ delegation: { assignedNation: null, assignedNonStateActor: { id: 'n' } } }], [])
				.accepted
		).toBe(true);
		expect(supervisor([], [{ assignedRole: { id: 'r' } }]).accepted).toBe(true);
		expect(supervisor([], [{ assignedRole: null }]).accepted).toBe(false);
	});

	test('maps single participants with and without an assigned role', () => {
		const rows = transformParticipants(
			{
				...empty,
				singleParticipants: [
					{
						applied: true,
						school: 'School',
						assignedRole: { name: 'Press', fontAwesomeIcon: 'newspaper' },
						user: user('p1')
					},
					{ applied: true, school: null, assignedRole: null, user: user('p2') }
				]
			},
			start,
			end
		);
		expect(rows[0]).toMatchObject({
			role: 'SINGLE_PARTICIPANT',
			delegationSchool: 'School',
			assignedRoleName: 'Press',
			assignedRoleIcon: 'newspaper',
			accepted: true
		});
		expect(rows[1]).toMatchObject({
			delegationSchool: null,
			assignedRoleName: null,
			assignedRoleIcon: null,
			accepted: false
		});
	});

	test('team members are always accepted and keep their team role', () => {
		const [row] = transformParticipants(
			{ ...empty, teamMembers: [{ role: 'PROJECT_MANAGEMENT', user: user('t') }] },
			start,
			end
		);
		expect(row).toMatchObject({
			role: 'TEAM_MEMBER',
			teamRole: 'PROJECT_MANAGEMENT',
			accepted: true
		});
	});

	test('joins the status row and derives the postal registration status', () => {
		const adult = user('adult', { birthday: new Date('1990-01-01') });
		const minor = user('minor', { birthday: new Date('2015-01-01') });
		const problem = user('problem');
		const rows = transformParticipants(
			{
				...empty,
				teamMembers: [
					{ role: 'MEMBER', user: adult },
					{ role: 'MEMBER', user: minor },
					{ role: 'MEMBER', user: problem }
				],
				participantStatuses: [
					status('adult', {
						paymentStatus: 'DONE',
						termsAndConditions: 'DONE',
						mediaConsent: 'DONE',
						didAttend: true,
						assignedDocumentNumber: 7,
						accessCardId: 'card'
					}),
					status('minor', { termsAndConditions: 'DONE', mediaConsent: 'DONE' }),
					status('problem', { mediaConsent: 'PROBLEM' })
				]
			},
			start,
			end
		);
		expect(rows[0]).toMatchObject({
			paymentStatus: 'DONE',
			postalRegistrationStatus: 'DONE',
			didAttend: true,
			documentNumber: 7,
			accessCardId: 'card'
		});
		expect(rows[0].ageAtConference).toBe(36);
		expect(rows[1].postalRegistrationStatus).toBe('PENDING');
		expect(rows[2].postalRegistrationStatus).toBe('PROBLEM');
	});

	test('flags birthdays that fall within the conference', () => {
		const rows = transformParticipants(
			{
				...empty,
				teamMembers: [
					{ role: 'MEMBER', user: user('during', { birthday: new Date(2000, 2, 13) }) },
					{ role: 'MEMBER', user: user('outside', { birthday: new Date(2000, 5, 1) }) }
				]
			},
			start.toISOString(),
			end.toISOString()
		);
		expect(rows[0].hasBirthdayDuringConference).toBe(true);
		expect(rows[1].hasBirthdayDuringConference).toBe(false);
	});

	test('without conference dates there is no age and no birthday flag', () => {
		const [row] = transformParticipants(
			{
				...empty,
				teamMembers: [{ role: 'MEMBER', user: user('x', { birthday: new Date(2000, 2, 13) }) }]
			},
			undefined,
			undefined
		);
		expect(row.ageAtConference).toBeNull();
		expect(row.hasBirthdayDuringConference).toBe(false);
	});
});
