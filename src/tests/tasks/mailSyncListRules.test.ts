import { describe, expect, test } from 'vitest';
import type { ConferenceState, TeamRole } from '@prisma/client';
import { computeSubscriberState } from '../../tasks/mailSync/listRules';
import type { MailSyncUser } from '../../tasks/mailSync/types';

/**
 * Which lists a user ends up on. One describe per rule in `listRules.ts`; the retention window has
 * its own tests in `mailSyncWindow.test.ts`.
 */

const CUTOFF = new Date('2026-01-01T00:00:00Z');
const RECENT = new Date('2026-09-01T00:00:00Z');

function conference(state: ConferenceState = 'PREPARATION', id = 'CONFab1') {
	return { id, title: 'MUN-SH 2026', state, endConference: RECENT };
}

const list = (type: string, id = 'CONFab1') => `[${id.slice(0, 6)}] MUN-SH 2026 - ${type}`;

function user(overrides: Partial<MailSyncUser> = {}): MailSyncUser {
	return {
		id: 'u1',
		email: 'erika@example.org',
		given_name: 'Erika',
		family_name: 'Mustermann',
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false,
		delegationMemberships: [],
		singleParticipant: [],
		conferenceSupervisor: [],
		teamMember: [],
		...overrides
	};
}

type Delegation = MailSyncUser['delegationMemberships'][number]['delegation'];

function delegationMember(
	delegation: Partial<Omit<Delegation, 'conference'>> = {},
	isHeadDelegate = false,
	conf = conference()
): MailSyncUser['delegationMemberships'][number] {
	return {
		conferenceId: conf.id,
		isHeadDelegate,
		delegation: {
			applied: true,
			assignedNationAlpha3Code: null,
			assignedNonStateActorId: null,
			conference: conf,
			...delegation
		}
	};
}

function singleParticipant(
	sp: { applied?: boolean; assignedRoleId?: string | null } = {},
	conf = conference()
): MailSyncUser['singleParticipant'][number] {
	return {
		conferenceId: conf.id,
		applied: sp.applied ?? true,
		assignedRoleId: sp.assignedRoleId ?? null,
		conference: conf
	};
}

function supervisor(
	supervised: {
		delegations?: Partial<Omit<Delegation, 'conference'>>[];
		singles?: { applied: boolean; assignedRoleId: string | null }[];
	},
	conf = conference()
): MailSyncUser['conferenceSupervisor'][number] {
	return {
		conferenceId: conf.id,
		conference: conf,
		supervisedDelegationMembers: (supervised.delegations ?? []).map((d) => ({
			delegation: {
				applied: true,
				assignedNationAlpha3Code: null,
				assignedNonStateActorId: null,
				...d
			}
		})),
		supervisedSingleParticipants: supervised.singles ?? []
	};
}

function teamMember(role: TeamRole, conf = conference()): MailSyncUser['teamMember'][number] {
	return { conferenceId: conf.id, role, conference: conf };
}

const listsOf = (u: MailSyncUser) => computeSubscriberState(u, CUTOFF).listNames.sort();
const rolesOf = (u: MailSyncUser) =>
	computeSubscriberState(u, CUTOFF).attribs.conferences.map((c) => c.role);

describe('subscriber basics', () => {
	test('trims the address, formats the name and records the user id', () => {
		const state = computeSubscriberState(
			user({
				email: '  Erika@Example.org ',
				given_name: 'erika',
				family_name: 'von der mustermann'
			}),
			CUTOFF
		);
		expect(state.email).toBe('Erika@Example.org');
		expect(state.formattedName).toBe('Erika von der Mustermann');
		expect(state.attribs.userId).toBe('u1');
	});

	test('puts a user without opt-ins or participations on no list', () => {
		expect(listsOf(user())).toEqual([]);
	});

	test('lists every list only once, even when two rules ask for it', () => {
		const u = user({
			delegationMemberships: [delegationMember({ applied: true, assignedNationAlpha3Code: 'DEU' })],
			teamMember: [teamMember('PROJECT_MANAGEMENT')]
		});
		const lists = computeSubscriberState(u, CUTOFF).listNames;
		expect(lists.filter((l) => l === list('REGISTRATION_COMPLETED'))).toHaveLength(1);
	});
});

describe('global lists', () => {
	test('follow the opt-ins', () => {
		expect(listsOf(user({ wantsToReceiveGeneralInformation: true }))).toEqual([
			'[global] DMUN_NEWSLETTER'
		]);
		expect(listsOf(user({ wantsJoinTeamInformation: true }))).toEqual([
			'[global] DMUN_TEAM_TENDERS'
		]);
	});

	test('add no conference to the attribs', () => {
		const u = user({ wantsToReceiveGeneralInformation: true, wantsJoinTeamInformation: true });
		expect(computeSubscriberState(u, CUTOFF).attribs.conferences).toEqual([]);
	});
});

describe('delegation members', () => {
	test('of a nation: nation list and registration completed', () => {
		const u = user({
			delegationMemberships: [delegationMember({ assignedNationAlpha3Code: 'DEU' })]
		});
		expect(listsOf(u)).toEqual(
			[list('DELEGATION_MEMBERS_NATIONS'), list('REGISTRATION_COMPLETED')].sort()
		);
		expect(rolesOf(u)).toEqual(['DELEGATE_NATION']);
	});

	test('of a non-state actor: NSA list', () => {
		const u = user({
			delegationMemberships: [delegationMember({ assignedNonStateActorId: 'nsa1' })]
		});
		expect(listsOf(u)).toEqual(
			[list('DELEGATION_MEMBERS_NSA'), list('REGISTRATION_COMPLETED')].sort()
		);
		expect(rolesOf(u)).toEqual(['DELEGATE_NSA']);
	});

	test('head delegates of an assigned delegation also get the head delegate list', () => {
		const u = user({
			delegationMemberships: [delegationMember({ assignedNationAlpha3Code: 'DEU' }, true)]
		});
		expect(listsOf(u)).toContain(list('HEAD_DELEGATES'));
	});

	test('head delegates of an unassigned delegation do not', () => {
		const u = user({ delegationMemberships: [delegationMember({}, true)] });
		expect(listsOf(u)).not.toContain(list('HEAD_DELEGATES'));
	});

	test('applied but unassigned: registration completed and rejected, role unknown', () => {
		const u = user({ delegationMemberships: [delegationMember({ applied: true })] });
		expect(listsOf(u)).toEqual(
			[list('REGISTRATION_COMPLETED'), list('REJECTED_PARTICIPANTS')].sort()
		);
		expect(rolesOf(u)).toEqual([undefined]);
	});

	test('not yet applied: registration not completed', () => {
		const u = user({ delegationMemberships: [delegationMember({ applied: false })] });
		expect(listsOf(u)).toEqual([list('REGISTRATION_NOT_COMPLETED')]);
	});
});

describe('single participants', () => {
	test('applied with a role: single participants and registration completed', () => {
		const u = user({ singleParticipant: [singleParticipant({ assignedRoleId: 'r1' })] });
		expect(listsOf(u)).toEqual(
			[list('REGISTRATION_COMPLETED'), list('SINGLE_PARTICIPANTS')].sort()
		);
		expect(rolesOf(u)).toEqual(['SINGLE_PARTICIPANT']);
	});

	test('applied without a role: rejected', () => {
		const u = user({ singleParticipant: [singleParticipant({ assignedRoleId: null })] });
		expect(listsOf(u)).toEqual(
			[list('REGISTRATION_COMPLETED'), list('REJECTED_PARTICIPANTS')].sort()
		);
	});

	test('not yet applied: registration not completed', () => {
		const u = user({ singleParticipant: [singleParticipant({ applied: false })] });
		expect(listsOf(u)).toEqual([list('REGISTRATION_NOT_COMPLETED')]);
	});
});

describe('supervisors', () => {
	const registration = conference('PARTICIPANT_REGISTRATION');

	test('during registration: supervisors list once a supervised delegation applied', () => {
		const u = user({
			conferenceSupervisor: [supervisor({ delegations: [{ applied: true }] }, registration)]
		});
		expect(listsOf(u)).toEqual([list('SUPERVISORS')]);
		expect(rolesOf(u)).toEqual(['SUPERVISOR']);
	});

	test('during registration: the reminder list while someone supervised has not applied', () => {
		const u = user({
			conferenceSupervisor: [
				supervisor({ singles: [{ applied: false, assignedRoleId: null }] }, registration)
			]
		});
		expect(listsOf(u)).toEqual([list('SUPERVISORS_REGISTRATION_NOT_COMPLETED')]);
	});

	test('during registration: both lists when supervising applied and pending participants', () => {
		const u = user({
			conferenceSupervisor: [
				supervisor(
					{
						delegations: [{ applied: true }],
						singles: [{ applied: false, assignedRoleId: null }]
					},
					registration
				)
			]
		});
		expect(listsOf(u)).toEqual(
			[list('SUPERVISORS'), list('SUPERVISORS_REGISTRATION_NOT_COMPLETED')].sort()
		);
	});

	test('during registration: no list without anyone to supervise', () => {
		expect(listsOf(user({ conferenceSupervisor: [supervisor({}, registration)] }))).toEqual([]);
	});

	test('after registration: supervisors list only with an assigned delegation or role', () => {
		const assigned = user({
			conferenceSupervisor: [supervisor({ delegations: [{ assignedNationAlpha3Code: 'DEU' }] })]
		});
		const assignedSingle = user({
			conferenceSupervisor: [supervisor({ singles: [{ applied: true, assignedRoleId: 'r1' }] })]
		});
		const rejected = user({
			conferenceSupervisor: [
				supervisor({
					delegations: [{ applied: true }],
					singles: [{ applied: true, assignedRoleId: null }]
				})
			]
		});
		expect(listsOf(assigned)).toEqual([list('SUPERVISORS')]);
		expect(listsOf(assignedSingle)).toEqual([list('SUPERVISORS')]);
		expect(listsOf(rejected)).toEqual([]);
	});

	test('after registration: no reminder list any more', () => {
		const u = user({
			conferenceSupervisor: [supervisor({ singles: [{ applied: false, assignedRoleId: null }] })]
		});
		expect(listsOf(u)).toEqual([]);
	});
});

describe('team members', () => {
	test.each(['MEMBER', 'REVIEWER', 'TEAM_COORDINATOR', 'CONTENT_LEAD'] as const)(
		'%s: team list only',
		(role) => {
			const u = user({ teamMember: [teamMember(role)] });
			expect(listsOf(u)).toEqual([list('TEAM')]);
			expect(rolesOf(u)).toEqual([role]);
		}
	);

	test.each(['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const)(
		'%s: also the registration and supervisor lists',
		(role) => {
			expect(listsOf(user({ teamMember: [teamMember(role)] }))).toEqual(
				[
					list('TEAM'),
					list('REGISTRATION_COMPLETED'),
					list('REGISTRATION_NOT_COMPLETED'),
					list('SUPERVISORS')
				].sort()
			);
		}
	);
});

describe('several conferences', () => {
	test('keep their lists and attribs apart', () => {
		const a = conference('PREPARATION', 'AAAAAA1');
		const b = conference('PREPARATION', 'BBBBBB1');
		const state = computeSubscriberState(
			user({
				teamMember: [teamMember('MEMBER', a)],
				singleParticipant: [singleParticipant({ assignedRoleId: 'r1' }, b)]
			}),
			CUTOFF
		);
		expect(state.listNames.sort()).toEqual(
			[
				list('TEAM', 'AAAAAA1'),
				list('REGISTRATION_COMPLETED', 'BBBBBB1'),
				list('SINGLE_PARTICIPANTS', 'BBBBBB1')
			].sort()
		);
		expect(state.attribs.conferences).toEqual([
			{ id: 'BBBBBB1', role: 'SINGLE_PARTICIPANT', title: 'MUN-SH 2026' },
			{ id: 'AAAAAA1', role: 'MEMBER', title: 'MUN-SH 2026' }
		]);
	});
});
