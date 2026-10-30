import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import {
	applicationStatus,
	participationOf,
	roleIcon,
	roleText,
	supervisorParticipation,
	type ParticipationInput
} from './myConferenceCardParticipation';

const REG = 'PARTICIPANT_REGISTRATION';
const PREP = 'PREPARATION';

const none: ParticipationInput = {
	teamMember: null,
	delegationMember: null,
	singleParticipant: null
};
type DelegationRole = NonNullable<
	ParticipationInput['delegationMember']
>['delegation']['assignedRole'];

const nation = { alpha2Code: 'fr', alpha3Code: 'FRA' };
const nationRole: DelegationRole = {
	kind: 'NATION',
	name: null,
	fontAwesomeIcon: null,
	nation
};
const nsa: DelegationRole = {
	kind: 'NON_STATE_ACTOR',
	name: 'Greenpeace',
	fontAwesomeIcon: 'fa-leaf',
	nation: null
};

function delegationMember(assignedRole: DelegationRole = null, applied = true): ParticipationInput {
	return {
		...none,
		delegationMember: {
			isHeadDelegate: true,
			assignedCommittee: { name: 'Security Council', abbreviation: 'SC' },
			delegation: { applied, assignedRole }
		}
	};
}

describe('applicationStatus', () => {
	test('assigned wins', () => expect(applicationStatus(true, false, PREP)).toBe('accepted'));
	test('not applied is pending', () =>
		expect(applicationStatus(false, false, PREP)).toBe('pending'));
	test('applied during registration', () =>
		expect(applicationStatus(false, true, REG)).toBe('applied'));
	test('applied after registration', () =>
		expect(applicationStatus(false, true, PREP)).toBe('rejected'));
});

describe('supervisorParticipation', () => {
	test('counts students and accepts once one is assigned', () => {
		expect(
			supervisorParticipation(
				{
					supervisedDelegationMembers: [
						{ delegation: { assignedRole: {} } },
						{ delegation: { assignedRole: {} } },
						{ delegation: { assignedRole: null } }
					],
					supervisedSingleParticipants: [{ assignedRole: {} }, { assignedRole: null }]
				},
				PREP
			)
		).toEqual({ type: 'supervisor', status: 'accepted', studentCount: 5, acceptedStudentCount: 3 });
	});
	test('pending during registration, rejected afterwards; missing lists count as empty', () => {
		expect(supervisorParticipation({}, REG)).toMatchObject({ status: 'pending', studentCount: 0 });
		expect(
			supervisorParticipation(
				{ supervisedDelegationMembers: null, supervisedSingleParticipants: null },
				PREP
			)
		).toMatchObject({ status: 'rejected' });
	});
});

describe('participationOf', () => {
	test('a team member takes precedence', () => {
		expect(
			participationOf({ ...delegationMember(), teamMember: { role: 'ADMIN' } }, {}, PREP)
		).toEqual({ type: 'teamMember', status: 'accepted', teamRole: 'ADMIN' });
	});

	test('a delegation member', () => {
		expect(participationOf(delegationMember(nationRole), undefined, PREP)).toEqual({
			type: 'delegation',
			status: 'accepted',
			country: nation,
			nonStateActor: null,
			committee: { name: 'Security Council', abbreviation: 'SC' },
			isHeadDelegate: true
		});
		expect(participationOf(delegationMember(nsa), undefined, PREP).status).toBe('accepted');
		expect(participationOf(delegationMember(null, true), undefined, REG).status).toBe('applied');
	});

	test('a single participant', () => {
		const role = { name: 'Press', fontAwesomeIcon: 'fa-camera' };
		expect(
			participationOf(
				{ ...none, singleParticipant: { applied: false, assignedRole: role } },
				undefined,
				PREP
			)
		).toEqual({ type: 'singleParticipant', status: 'accepted', customRole: role });
		expect(
			participationOf(
				{ ...none, singleParticipant: { applied: false, assignedRole: null } },
				undefined,
				PREP
			).status
		).toBe('pending');
	});

	test('a supervisor', () => {
		expect(participationOf(none, {}, REG).type).toBe('supervisor');
	});

	test('nothing known', () => {
		const unknown = { type: 'unknown', status: 'pending' };
		expect(participationOf(none, undefined, REG)).toEqual(unknown);
		expect(participationOf(undefined, undefined, REG)).toEqual(unknown);
	});
});

describe('roleIcon', () => {
	test('per role', () => {
		expect(roleIcon(participationOf(delegationMember(), undefined, REG))).toBe('fa-users');
		expect(roleIcon(participationOf(none, {}, REG))).toBe('fa-chalkboard-teacher');
		expect(
			roleIcon(participationOf({ ...none, teamMember: { role: 'MEMBER' } }, undefined, REG))
		).toBe('fa-users-gear');
		expect(roleIcon(participationOf(none, undefined, REG))).toBeUndefined();
	});

	test('a single participant shows their role icon without a doubled prefix, or a user', () => {
		const withIcon = participationOf(
			{
				...none,
				singleParticipant: {
					applied: true,
					assignedRole: { name: 'P', fontAwesomeIcon: 'fa-camera' }
				}
			},
			undefined,
			REG
		);
		expect(roleIcon(withIcon)).toBe('fa-camera');
		const noIcon = participationOf(
			{
				...none,
				singleParticipant: { applied: true, assignedRole: { name: 'P', fontAwesomeIcon: null } }
			},
			undefined,
			REG
		);
		expect(roleIcon(noIcon)).toBe('fa-user');
		const noRole = participationOf(
			{ ...none, singleParticipant: { applied: true, assignedRole: null } },
			undefined,
			REG
		);
		expect(roleIcon(noRole)).toBe('fa-user');
	});
});

describe('roleText', () => {
	test('delegation: nation, NSA or neither', () => {
		expect(roleText(participationOf(delegationMember(nationRole), undefined, REG))).toBe(
			m.delegateFor({ country: getFullTranslatedCountryNameFromISO3Code('FRA') })
		);
		expect(roleText(participationOf(delegationMember(nsa), undefined, REG))).toBe(
			m.delegateFor({ country: 'Greenpeace' })
		);
		expect(roleText(participationOf(delegationMember(), undefined, REG))).toBe(m.delegation());
	});

	test('single participant: role name or generic', () => {
		expect(
			roleText(
				participationOf(
					{
						...none,
						singleParticipant: {
							applied: true,
							assignedRole: { name: 'Press', fontAwesomeIcon: null }
						}
					},
					undefined,
					REG
				)
			)
		).toBe('Press');
		expect(
			roleText(
				participationOf(
					{ ...none, singleParticipant: { applied: true, assignedRole: null } },
					undefined,
					REG
				)
			)
		).toBe(m.singleParticipant());
	});

	test('supervisor, team member and unknown', () => {
		expect(roleText(participationOf(none, {}, REG))).toBe(m.supervisorWithStudents({ count: 0 }));
		expect(
			roleText(participationOf({ ...none, teamMember: { role: 'ADMIN' } }, undefined, REG))
		).toBe(m.teamMemberWithRole({ role: translateTeamRole('ADMIN') }));
		expect(roleText(participationOf(none, undefined, REG))).toBe('');
	});
});
