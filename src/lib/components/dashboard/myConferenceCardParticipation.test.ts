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
	test('assigned wins', () =>
		expect(applicationStatus({ assigned: true, applied: false, conferenceState: PREP })).toBe(
			'accepted'
		));
	test('not applied is pending', () =>
		expect(applicationStatus({ assigned: false, applied: false, conferenceState: PREP })).toBe(
			'pending'
		));
	test('applied during registration', () =>
		expect(applicationStatus({ assigned: false, applied: true, conferenceState: REG })).toBe(
			'applied'
		));
	test('applied after registration', () =>
		expect(applicationStatus({ assigned: false, applied: true, conferenceState: PREP })).toBe(
			'rejected'
		));
});

describe('supervisorParticipation', () => {
	test('counts students and accepts once one is assigned', () => {
		expect(
			supervisorParticipation({
				supervisor: {
					supervisedDelegationMembers: [
						{ delegation: { assignedRole: {} } },
						{ delegation: { assignedRole: {} } },
						{ delegation: { assignedRole: null } }
					],
					supervisedSingleParticipants: [{ assignedRole: {} }, { assignedRole: null }]
				},
				conferenceState: PREP
			})
		).toEqual({ type: 'supervisor', status: 'accepted', studentCount: 5, acceptedStudentCount: 3 });
	});
	test('pending during registration, rejected afterwards; missing lists count as empty', () => {
		expect(supervisorParticipation({ supervisor: {}, conferenceState: REG })).toMatchObject({
			status: 'pending',
			studentCount: 0
		});
		expect(
			supervisorParticipation({
				supervisor: { supervisedDelegationMembers: null, supervisedSingleParticipants: null },
				conferenceState: PREP
			})
		).toMatchObject({ status: 'rejected' });
	});
});

describe('participationOf', () => {
	test('a team member takes precedence', () => {
		expect(
			participationOf({
				myParticipation: { ...delegationMember(), teamMember: { role: 'ADMIN' } },
				supervisedStudents: {},
				conferenceState: PREP
			})
		).toEqual({ type: 'teamMember', status: 'accepted', teamRole: 'ADMIN' });
	});

	test('a delegation member', () => {
		expect(
			participationOf({
				myParticipation: delegationMember(nationRole),
				supervisedStudents: undefined,
				conferenceState: PREP
			})
		).toEqual({
			type: 'delegation',
			status: 'accepted',
			country: nation,
			nonStateActor: null,
			committee: { name: 'Security Council', abbreviation: 'SC' },
			isHeadDelegate: true
		});
		expect(
			participationOf({
				myParticipation: delegationMember(nsa),
				supervisedStudents: undefined,
				conferenceState: PREP
			}).status
		).toBe('accepted');
		expect(
			participationOf({
				myParticipation: delegationMember(null, true),
				supervisedStudents: undefined,
				conferenceState: REG
			}).status
		).toBe('applied');
	});

	test('a single participant', () => {
		const role = { name: 'Press', fontAwesomeIcon: 'fa-camera' };
		expect(
			participationOf({
				myParticipation: { ...none, singleParticipant: { applied: false, assignedRole: role } },
				supervisedStudents: undefined,
				conferenceState: PREP
			})
		).toEqual({ type: 'singleParticipant', status: 'accepted', customRole: role });
		expect(
			participationOf({
				myParticipation: { ...none, singleParticipant: { applied: false, assignedRole: null } },
				supervisedStudents: undefined,
				conferenceState: PREP
			}).status
		).toBe('pending');
	});

	test('a supervisor', () => {
		expect(
			participationOf({ myParticipation: none, supervisedStudents: {}, conferenceState: REG }).type
		).toBe('supervisor');
	});

	test('nothing known', () => {
		const unknown = { type: 'unknown', status: 'pending' };
		expect(
			participationOf({
				myParticipation: none,
				supervisedStudents: undefined,
				conferenceState: REG
			})
		).toEqual(unknown);
		expect(
			participationOf({
				myParticipation: undefined,
				supervisedStudents: undefined,
				conferenceState: REG
			})
		).toEqual(unknown);
	});
});

describe('roleIcon', () => {
	test('per role', () => {
		expect(
			roleIcon(
				participationOf({
					myParticipation: delegationMember(),
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe('fa-users');
		expect(
			roleIcon(
				participationOf({ myParticipation: none, supervisedStudents: {}, conferenceState: REG })
			)
		).toBe('fa-chalkboard-teacher');
		expect(
			roleIcon(
				participationOf({
					myParticipation: { ...none, teamMember: { role: 'MEMBER' } },
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe('fa-users-gear');
		expect(
			roleIcon(
				participationOf({
					myParticipation: none,
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBeUndefined();
	});

	test('a single participant shows their role icon without a doubled prefix, or a user', () => {
		const withIcon = participationOf({
			myParticipation: {
				...none,
				singleParticipant: {
					applied: true,
					assignedRole: { name: 'P', fontAwesomeIcon: 'fa-camera' }
				}
			},
			supervisedStudents: undefined,
			conferenceState: REG
		});
		expect(roleIcon(withIcon)).toBe('fa-camera');
		const noIcon = participationOf({
			myParticipation: {
				...none,
				singleParticipant: { applied: true, assignedRole: { name: 'P', fontAwesomeIcon: null } }
			},
			supervisedStudents: undefined,
			conferenceState: REG
		});
		expect(roleIcon(noIcon)).toBe('fa-user');
		const noRole = participationOf({
			myParticipation: { ...none, singleParticipant: { applied: true, assignedRole: null } },
			supervisedStudents: undefined,
			conferenceState: REG
		});
		expect(roleIcon(noRole)).toBe('fa-user');
	});
});

describe('roleText', () => {
	test('delegation: nation, NSA or neither', () => {
		expect(
			roleText(
				participationOf({
					myParticipation: delegationMember(nationRole),
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe(m.delegateFor({ country: getFullTranslatedCountryNameFromISO3Code('FRA') }));
		expect(
			roleText(
				participationOf({
					myParticipation: delegationMember(nsa),
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe(m.delegateFor({ country: 'Greenpeace' }));
		expect(
			roleText(
				participationOf({
					myParticipation: delegationMember(),
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe(m.delegation());
	});

	test('single participant: role name or generic', () => {
		expect(
			roleText(
				participationOf({
					myParticipation: {
						...none,
						singleParticipant: {
							applied: true,
							assignedRole: { name: 'Press', fontAwesomeIcon: null }
						}
					},
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe('Press');
		expect(
			roleText(
				participationOf({
					myParticipation: { ...none, singleParticipant: { applied: true, assignedRole: null } },
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe(m.singleParticipant());
	});

	test('supervisor, team member and unknown', () => {
		expect(
			roleText(
				participationOf({ myParticipation: none, supervisedStudents: {}, conferenceState: REG })
			)
		).toBe(m.supervisorWithStudents({ count: 0 }));
		expect(
			roleText(
				participationOf({
					myParticipation: { ...none, teamMember: { role: 'ADMIN' } },
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe(m.teamMemberWithRole({ role: translateTeamRole('ADMIN') }));
		expect(
			roleText(
				participationOf({
					myParticipation: none,
					supervisedStudents: undefined,
					conferenceState: REG
				})
			)
		).toBe('');
	});
});
