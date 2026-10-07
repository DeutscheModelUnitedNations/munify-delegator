import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { translateTeamRole } from '$lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { describeParticipant, type ParticipationRoles } from './participantInfo';

const nobody: ParticipationRoles = {
	delegationMember: null,
	singleParticipant: null,
	teamMember: null,
	supervisor: null
};

function delegationMember(
	delegation: NonNullable<ParticipationRoles['delegationMember']>['delegation'],
	committee: { abbreviation: string } | null = null
): ParticipationRoles {
	return { ...nobody, delegationMember: { assignedCommittee: committee, delegation } };
}

describe('describeParticipant', () => {
	test('a delegation member with a nation shows the nation, committee and flag code', () => {
		const info = describeParticipant(
			delegationMember(
				{
					assignedNation: { alpha2Code: 'DE', alpha3Code: 'DEU' },
					assignedNonStateActor: null
				},
				{ abbreviation: 'GA' }
			)
		);
		expect(info).toEqual({
			type: 'delegation',
			roleDisplay: getFullTranslatedCountryNameFromISO3Code('DEU'),
			committeeAbbreviation: 'GA',
			alpha2Code: 'de'
		});
	});

	test('a delegation member without a committee has no committee abbreviation', () => {
		const info = describeParticipant(
			delegationMember({
				assignedNation: { alpha2Code: 'FR', alpha3Code: 'FRA' },
				assignedNonStateActor: null
			})
		);
		expect(info.committeeAbbreviation).toBeUndefined();
		expect(info.alpha2Code).toBe('fr');
	});

	test('a delegation member of a non-state actor shows its name and icon', () => {
		const info = describeParticipant(
			delegationMember({
				assignedNation: null,
				assignedNonStateActor: { name: 'Amnesty International', fontAwesomeIcon: 'candle' }
			})
		);
		expect(info).toEqual({
			type: 'delegation',
			roleDisplay: 'Amnesty International',
			isNSA: true,
			nsaIcon: 'candle'
		});
	});

	test('a delegation member without an assignment is unassigned', () => {
		const info = describeParticipant(
			delegationMember({ assignedNation: null, assignedNonStateActor: null })
		);
		expect(info).toEqual({ type: 'unassigned', roleDisplay: '' });
	});

	test('a single participant with a role shows the role', () => {
		const info = describeParticipant({
			...nobody,
			singleParticipant: { assignedRole: { name: 'Press', fontAwesomeIcon: null } }
		});
		expect(info).toEqual({ type: 'single', roleDisplay: 'Press', isNSA: true, nsaIcon: null });
	});

	test('a single participant without a role is unassigned', () => {
		const info = describeParticipant({ ...nobody, singleParticipant: { assignedRole: null } });
		expect(info).toEqual({ type: 'unassigned', roleDisplay: '' });
	});

	test('a team member shows the translated team role', () => {
		const info = describeParticipant({ ...nobody, teamMember: { role: 'REVIEWER' } });
		expect(info).toEqual({
			type: 'team',
			roleDisplay: translateTeamRole('REVIEWER'),
			isNSA: true,
			nsaIcon: 'users-gear'
		});
	});

	test('a supervisor is shown as such', () => {
		const info = describeParticipant({ ...nobody, supervisor: {} });
		expect(info).toEqual({
			type: 'supervisor',
			roleDisplay: m.supervisor(),
			isNSA: true,
			nsaIcon: 'chalkboard-user'
		});
	});

	test('a delegation membership wins over the other roles', () => {
		const info = describeParticipant({
			...delegationMember({ assignedNation: null, assignedNonStateActor: null }),
			teamMember: { role: 'MEMBER' },
			supervisor: {}
		});
		expect(info.type).toBe('unassigned');
	});

	test('someone without any role is none', () => {
		expect(describeParticipant(nobody)).toEqual({ type: 'none', roleDisplay: '' });
	});
});
