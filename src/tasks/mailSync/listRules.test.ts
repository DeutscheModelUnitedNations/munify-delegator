import { describe, expect, test } from 'vitest';
import { computeSubscriberState } from './listRules';
import type { MailSyncUser } from './types';

type Conference = MailSyncUser['teamMember'][number]['conference'];
type Delegation = MailSyncUser['delegationMemberships'][number]['delegation'];

const registration: Conference = {
	id: 'abcdef123',
	title: 'MUN-SH',
	state: 'PARTICIPANT_REGISTRATION',
	assignmentReleased: false
};
const preparation: Conference = {
	id: 'ghijkl456',
	title: 'MUN-BW',
	state: 'PREPARATION',
	assignmentReleased: true
};
/** Registration is over, but the team has not released the assignment yet. */
const unreleased: Conference = { ...preparation, assignmentReleased: false };

const list = (conference: Conference, type: string) =>
	`[${conference.id.slice(0, 6)}] ${conference.title} - ${type}`;

function user(overrides: Partial<MailSyncUser> = {}): MailSyncUser {
	return {
		id: 'u1',
		email: '  erika@example.org ',
		givenName: 'erika',
		familyName: 'mustermann',
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false,
		delegationMemberships: [],
		singleParticipant: [],
		conferenceSupervisor: [],
		teamMember: [],
		...overrides
	};
}

function delegation(overrides: Partial<Delegation> = {}): Delegation {
	return {
		applied: true,
		assignedNationAlpha3Code: null,
		assignedNonStateActorId: null,
		conference: preparation,
		...overrides
	};
}

const asMember = (d: Delegation, isHeadDelegate = false) => ({
	conferenceId: d.conference.id,
	isHeadDelegate,
	delegation: d
});

describe('computeSubscriberState', () => {
	test('normalizes the address and formats the name', () => {
		const state = computeSubscriberState(user({ givenName: '' }));
		expect(state).toEqual({
			email: 'erika@example.org',
			formattedName: 'Mustermann',
			listNames: [],
			attribs: { userId: 'u1', conferences: [] }
		});
		expect(computeSubscriberState(user()).formattedName).toBe('Erika Mustermann');
	});

	test('subscribes to the global lists the user opted into', () => {
		expect(
			computeSubscriberState(
				user({ wantsToReceiveGeneralInformation: true, wantsJoinTeamInformation: true })
			).listNames
		).toEqual(['[global] DMUN_NEWSLETTER', '[global] DMUN_TEAM_TENDERS']);
	});

	describe('delegation members', () => {
		const listsOf = (d: Delegation, isHeadDelegate = false) =>
			computeSubscriberState(user({ delegationMemberships: [asMember(d, isHeadDelegate)] }));

		test('put a nation head delegate on the nation, head delegate and completed lists', () => {
			const state = listsOf(delegation({ assignedNationAlpha3Code: 'DEU' }), true);
			expect(state.listNames).toEqual([
				list(preparation, 'DELEGATION_MEMBERS_NATIONS'),
				list(preparation, 'HEAD_DELEGATES'),
				list(preparation, 'REGISTRATION_COMPLETED')
			]);
			expect(state.attribs.conferences).toEqual([
				{ id: preparation.id, role: 'DELEGATE_NATION', title: 'MUN-BW' }
			]);
		});

		test('put a non-state actor delegate on the NSA list', () => {
			const state = listsOf(delegation({ assignedNonStateActorId: 'nsa' }));
			expect(state.listNames).toEqual([
				list(preparation, 'DELEGATION_MEMBERS_NSA'),
				list(preparation, 'REGISTRATION_COMPLETED')
			]);
			expect(state.attribs.conferences[0].role).toBe('DELEGATE_NSA');
		});

		test('count an applied delegation without a role as rejected, head delegate or not', () => {
			const state = listsOf(delegation(), true);
			expect(state.listNames).toEqual([
				list(preparation, 'REGISTRATION_COMPLETED'),
				list(preparation, 'REJECTED_PARTICIPANTS')
			]);
			expect(state.attribs.conferences[0].role).toBeUndefined();
		});

		test('hold back every role list until the assignment is released', () => {
			const state = listsOf(
				delegation({ assignedNationAlpha3Code: 'DEU', conference: unreleased }),
				true
			);
			expect(state.listNames).toEqual([list(unreleased, 'REGISTRATION_COMPLETED')]);
			expect(state.attribs.conferences[0].role).toBeUndefined();
			expect(listsOf(delegation({ conference: unreleased })).listNames).toEqual([
				list(unreleased, 'REGISTRATION_COMPLETED')
			]);
		});

		test('keep a delegation that has not applied on the not-completed list', () => {
			expect(listsOf(delegation({ applied: false })).listNames).toEqual([
				list(preparation, 'REGISTRATION_NOT_COMPLETED')
			]);
		});
	});

	describe('single participants', () => {
		const single = (
			applied: boolean,
			assignedRoleId: string | null,
			conference: Conference = preparation
		) => ({ conferenceId: conference.id, applied, assignedRoleId, conference });

		test('sort applications by whether they applied and got a role', () => {
			const state = computeSubscriberState(
				user({
					singleParticipant: [single(true, 'press'), single(true, null), single(false, null)]
				})
			);
			expect(state.listNames).toEqual([
				list(preparation, 'REGISTRATION_COMPLETED'),
				list(preparation, 'SINGLE_PARTICIPANTS'),
				list(preparation, 'REJECTED_PARTICIPANTS'),
				list(preparation, 'REGISTRATION_NOT_COMPLETED')
			]);
			expect(state.attribs.conferences).toHaveLength(3);
			expect(state.attribs.conferences[0]).toEqual({
				id: preparation.id,
				role: 'SINGLE_PARTICIPANT',
				title: 'MUN-BW'
			});
		});

		test('hold back whether they got a role until the assignment is released', () => {
			const state = computeSubscriberState(
				user({ singleParticipant: [single(true, 'press', unreleased)] })
			);
			expect(state.listNames).toEqual([list(unreleased, 'REGISTRATION_COMPLETED')]);
		});
	});

	describe('supervisors', () => {
		type Supervision = MailSyncUser['conferenceSupervisor'][number];
		const supervisor = (
			conference: Conference,
			delegations: Supervision['supervisedDelegationMembers'][number]['delegation'][],
			singles: Supervision['supervisedSingleParticipants']
		): Supervision => ({
			conferenceId: conference.id,
			conference,
			supervisedDelegationMembers: delegations.map((d) => ({ delegation: d })),
			supervisedSingleParticipants: singles
		});
		const supervised = (applied: boolean, assignedNationAlpha3Code: string | null = null) => ({
			applied,
			assignedNationAlpha3Code,
			assignedNonStateActorId: null
		});
		const listsOf = (s: Supervision) =>
			computeSubscriberState(user({ conferenceSupervisor: [s] })).listNames;

		test('during registration, follow whether their participants have applied', () => {
			expect(listsOf(supervisor(registration, [supervised(true)], []))).toEqual([
				list(registration, 'SUPERVISORS')
			]);
			expect(
				listsOf(supervisor(registration, [], [{ applied: false, assignedRoleId: null }]))
			).toEqual([list(registration, 'SUPERVISORS_REGISTRATION_NOT_COMPLETED')]);
			expect(
				listsOf(
					supervisor(registration, [supervised(false)], [{ applied: true, assignedRoleId: null }])
				)
			).toEqual([
				list(registration, 'SUPERVISORS'),
				list(registration, 'SUPERVISORS_REGISTRATION_NOT_COMPLETED')
			]);
			expect(listsOf(supervisor(registration, [], []))).toEqual([]);
		});

		test('afterwards, keep only supervisors of someone who got a role', () => {
			expect(listsOf(supervisor(preparation, [supervised(true, 'DEU')], []))).toEqual([
				list(preparation, 'SUPERVISORS')
			]);
			expect(
				listsOf(
					supervisor(
						preparation,
						[{ applied: true, assignedNationAlpha3Code: null, assignedNonStateActorId: 'nsa' }],
						[]
					)
				)
			).toEqual([list(preparation, 'SUPERVISORS')]);
			expect(
				listsOf(supervisor(preparation, [], [{ applied: true, assignedRoleId: 'press' }]))
			).toEqual([list(preparation, 'SUPERVISORS')]);
			expect(
				listsOf(
					supervisor(preparation, [supervised(true)], [{ applied: true, assignedRoleId: null }])
				)
			).toEqual([]);
		});

		test('before the release, follow the applications as during registration', () => {
			expect(listsOf(supervisor(unreleased, [supervised(true)], []))).toEqual([
				list(unreleased, 'SUPERVISORS')
			]);
		});

		test('record the supervision in the attribs', () => {
			const state = computeSubscriberState(
				user({ conferenceSupervisor: [supervisor(registration, [], [])] })
			);
			expect(state.attribs.conferences).toEqual([
				{ id: registration.id, role: 'SUPERVISOR', title: 'MUN-SH' }
			]);
		});
	});

	describe('team members', () => {
		const member = (role: MailSyncUser['teamMember'][number]['role']) => ({
			conferenceId: registration.id,
			role,
			conference: registration
		});

		test('put participant care and project management on the registration lists too', () => {
			const state = computeSubscriberState(
				user({ teamMember: [member('PARTICIPANT_CARE'), member('MEMBER')] })
			);
			expect(state.listNames).toEqual([
				list(registration, 'TEAM'),
				list(registration, 'REGISTRATION_COMPLETED'),
				list(registration, 'REGISTRATION_NOT_COMPLETED'),
				list(registration, 'SUPERVISORS')
			]);
			expect(state.attribs.conferences.map((c) => c.role)).toEqual(['PARTICIPANT_CARE', 'MEMBER']);
			expect(
				computeSubscriberState(user({ teamMember: [member('PROJECT_MANAGEMENT')] })).listNames
			).toHaveLength(4);
		});
	});

	test('lists every list once, across rules', () => {
		const state = computeSubscriberState(
			user({
				delegationMemberships: [asMember(delegation())],
				teamMember: [
					{ conferenceId: registration.id, role: 'PROJECT_MANAGEMENT', conference: registration }
				]
			})
		);
		expect(
			state.listNames.filter((name) => name === list(registration, 'REGISTRATION_COMPLETED'))
		).toHaveLength(1);
	});
});
