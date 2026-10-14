import { describe, expect, test } from 'vitest';
import {
	canEditCommittees,
	canEditConference,
	canEditConferenceContent,
	canPlanSeats,
	canWriteAccessCards,
	hasAnyRole,
	isOnTeam,
	NO_TEAM_ACCESS,
	type TeamAccess
} from './teamAccess';

const admin: TeamAccess = { isAdmin: true, roles: [] };
const as = (...roles: TeamAccess['roles']): TeamAccess => ({ isAdmin: false, roles });

describe('isOnTeam / hasAnyRole', () => {
	test('a system admin is on the team and holds every role without a team row', () => {
		expect(isOnTeam(admin)).toBe(true);
		expect(hasAnyRole(admin, ['PROJECT_MANAGEMENT'])).toBe(true);
	});

	test('anyone else needs a role, and any role of those asked for is enough', () => {
		expect(isOnTeam(NO_TEAM_ACCESS)).toBe(false);
		expect(isOnTeam(as('MEMBER'))).toBe(true);
		expect(hasAnyRole(as('REVIEWER'), ['PROJECT_MANAGEMENT'])).toBe(false);
		expect(hasAnyRole(as('REVIEWER', 'PARTICIPANT_CARE'), ['PARTICIPANT_CARE'])).toBe(true);
	});
});

describe('what each role may change', () => {
	test('only project management and admins edit the conference', () => {
		expect(canEditConference(admin)).toBe(true);
		expect(canEditConference(as('PROJECT_MANAGEMENT'))).toBe(true);
		for (const role of ['PARTICIPANT_CARE', 'CONTENT_LEAD', 'TEAM_COORDINATOR', 'REVIEWER']) {
			expect(canEditConference(as(role as TeamAccess['roles'][number]))).toBe(false);
		}
	});

	test('a second role is never shadowed by the first', () => {
		// This is what the old single `membership` string got wrong.
		expect(canEditConference(as('PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'))).toBe(true);
		expect(canPlanSeats(as('PARTICIPANT_CARE', 'CONTENT_LEAD'))).toBe(true);
	});

	test('the content is also kept by participant care and the content lead', () => {
		expect(canEditConferenceContent(as('PARTICIPANT_CARE'))).toBe(true);
		expect(canEditConferenceContent(as('CONTENT_LEAD'))).toBe(true);
		expect(canEditConferenceContent(as('TEAM_COORDINATOR'))).toBe(false);
	});

	test('committees go to project management and the content lead', () => {
		expect(canEditCommittees(as('CONTENT_LEAD'))).toBe(true);
		expect(canEditCommittees(as('PARTICIPANT_CARE'))).toBe(false);
	});

	test('access cards go to the care team', () => {
		expect(canWriteAccessCards(as('PARTICIPANT_CARE'))).toBe(true);
		expect(canWriteAccessCards(as('CONTENT_LEAD'))).toBe(false);
	});
});
