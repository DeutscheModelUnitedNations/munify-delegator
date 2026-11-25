import { describe, expect, it } from 'vitest';
import { seatEmblem } from './seatEmblem';

const labels = {
	countryName: (code: string) => ({ DEU: 'Deutschland' })[code] ?? code,
	teamRole: (role: string) => `team:${role}`,
	delegationMember: 'Delegationsmitglied',
	singleParticipant: 'Einzelteilnehmer*in',
	supervisor: 'Betreuer*in',
	teamMember: 'Teammitglied'
};
const member = (
	assignedRole: Parameters<typeof seatEmblem>[0]['parts']['delegationMember'] extends
		{ delegation: { assignedRole?: infer R } } | undefined
		? R
		: never
) => ({
	isHeadDelegate: true,
	assignedCommittee: { abbreviation: 'SR' },
	delegation: { assignedRole }
});

describe('seatEmblem', () => {
	it('lets the flag speak for a nation, its name for the hover', () => {
		const delegationMember = member({
			kind: 'NATION',
			name: null,
			icon: null,
			nation: { alpha2Code: 'de', alpha3Code: 'DEU' }
		});
		expect(seatEmblem({ parts: { delegationMember }, labels })).toEqual({
			alpha2Code: 'de',
			icon: 'flag',
			name: 'Deutschland',
			committee: 'SR',
			headDelegate: true
		});
	});

	it('names a non-state actor, which an icon alone does not', () => {
		const delegationMember = member({
			kind: 'NON_STATE_ACTOR',
			name: 'Amnesty International',
			icon: 'flame',
			nation: null
		});
		expect(seatEmblem({ parts: { delegationMember }, labels })).toMatchObject({
			icon: 'flame',
			line: 'Amnesty International'
		});
	});

	it('says what somebody is who has no role yet', () => {
		expect(seatEmblem({ parts: { delegationMember: member(null) }, labels })?.line).toBe(
			'Delegationsmitglied'
		);
		expect(seatEmblem({ parts: { singleParticipant: {} }, labels })?.line).toBe(
			'Einzelteilnehmer*in'
		);
	});

	it('shows single roles, supervisors and the team by icon and in words', () => {
		const singleParticipant = { assignedRole: { name: 'Fotografie', icon: 'camera' } };
		expect(seatEmblem({ parts: { singleParticipant }, labels })).toMatchObject({
			icon: 'camera',
			line: 'Fotografie'
		});
		expect(seatEmblem({ parts: { conferenceSupervisor: {} }, labels })?.line).toBe('Betreuer*in');
		expect(seatEmblem({ parts: { teamMember: { role: 'REVIEWER' } }, labels })?.line).toBe(
			'Teammitglied · team:REVIEWER'
		);
		expect(seatEmblem({ parts: { teamMember: {} }, labels })?.line).toBe('Teammitglied');
	});

	it('has nothing for somebody without a part', () => {
		expect(seatEmblem({ parts: {}, labels })).toBeUndefined();
	});
});
