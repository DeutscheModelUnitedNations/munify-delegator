import { describe, expect, test } from 'vitest';
import { computeSubscriberState } from './listRules';
import { mailSyncUserWhere, retentionCutoff, withinRetention } from './window';
import type { MailSyncUser } from './types';

const NOW = new Date('2026-10-23T12:00:00Z');
const CUTOFF = retentionCutoff(NOW);

function conference(id: string, endConference: string) {
	return {
		id,
		title: `MUN ${id}`,
		state: 'POST' as const,
		assignmentReleased: true,
		endConference: new Date(endConference)
	};
}

function user(overrides: Partial<MailSyncUser> = {}): MailSyncUser {
	return {
		id: 'u1',
		email: 'erika@example.org',
		givenName: 'Erika',
		familyName: 'Mustermann',
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false,
		delegationMemberships: [],
		singleParticipant: [],
		conferenceSupervisor: [],
		teamMember: [],
		...overrides
	};
}

function teamMember(conferenceId: string, endConference: string) {
	return {
		conferenceId,
		role: 'MEMBER' as const,
		conference: conference(conferenceId, endConference)
	};
}

describe('retentionCutoff', () => {
	test('lies ten months back', () => {
		// Months are counted in local time, so a DST change in between shifts the UTC instant.
		const expected = new Date(NOW);
		expected.setMonth(expected.getMonth() - 10);
		expect(CUTOFF.toISOString()).toBe(expected.toISOString());
	});
});

describe('mailSyncUserWhere', () => {
	test('loads opted-in users and recent participations, never by an upper bound', () => {
		const recent = { conference: { endConference: { gte: CUTOFF } } };
		expect(mailSyncUserWhere(CUTOFF).OR).toEqual([
			{ wantsToReceiveGeneralInformation: true },
			{ wantsJoinTeamInformation: true },
			{ delegationMemberships: recent },
			{ singleParticipant: recent },
			{ conferenceSupervisor: recent },
			{ teamMember: recent }
		]);
	});
});

describe('withinRetention', () => {
	test('drops old participations of every kind, keeps the rest of the user', () => {
		const old = conference('OLDabc1', '2025-03-01');
		const recent = conference('RECab1', '2026-03-01');
		const delegation = (c: typeof old) => ({
			applied: true,
			assignedRoleId: null,
			assignedRole: null,
			conference: c
		});
		const trimmed = withinRetention(
			user({
				wantsToReceiveGeneralInformation: true,
				delegationMemberships: [
					{ isHeadDelegate: false, delegation: delegation(old) },
					{ isHeadDelegate: true, delegation: delegation(recent) }
				],
				singleParticipant: [{ applied: true, assignedRoleId: null, conference: old }],
				conferenceSupervisor: [
					{ conference: old, supervisedDelegationMembers: [], supervisedSingleParticipants: [] }
				],
				teamMember: [teamMember('OLDabc1', '2025-03-01')]
			}),
			CUTOFF
		);
		expect(trimmed.wantsToReceiveGeneralInformation).toBe(true);
		expect(trimmed.delegationMemberships.map((m) => m.isHeadDelegate)).toEqual([true]);
		expect(trimmed.singleParticipant).toEqual([]);
		expect(trimmed.conferenceSupervisor).toEqual([]);
		expect(trimmed.teamMember).toEqual([]);
	});
});

describe('computeSubscriberState with the retention window', () => {
	test('drops a conference that ended more than ten months ago', () => {
		const state = computeSubscriberState(
			user({ teamMember: [teamMember('OLDabc1', '2025-03-01')] }),
			CUTOFF
		);
		expect(state.listNames).toEqual([]);
		expect(state.attribs.conferences).toEqual([]);
	});

	test('keeps recent and upcoming conferences', () => {
		const state = computeSubscriberState(
			user({
				teamMember: [teamMember('RECab1', '2026-03-01'), teamMember('UPCab1', '2027-11-01')]
			}),
			CUTOFF
		);
		expect(state.listNames).toEqual(['[RECab1] MUN RECab1 - TEAM', '[UPCab1] MUN UPCab1 - TEAM']);
		expect(state.attribs.conferences.map((c) => c.id)).toEqual(['RECab1', 'UPCab1']);
	});

	test('keeps the global opt-ins of a user whose conferences are all old', () => {
		const state = computeSubscriberState(
			user({
				wantsToReceiveGeneralInformation: true,
				wantsJoinTeamInformation: true,
				teamMember: [teamMember('OLDabc1', '2024-03-01')]
			}),
			CUTOFF
		);
		expect(state.listNames).toEqual(['[global] DMUN_NEWSLETTER', '[global] DMUN_TEAM_TENDERS']);
	});
});
