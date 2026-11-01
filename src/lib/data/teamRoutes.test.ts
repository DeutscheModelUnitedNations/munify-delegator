import { describe, expect, test } from 'vitest';
import {
	groupedTeamRoutes,
	mayOpenTeamRoute,
	teamRouteForPath,
	teamRoutes,
	teamRoutesFor
} from './teamRoutes';
import { NO_TEAM_ACCESS, type TeamAccess } from '#lib/helpers/teamAccess';

const as = (...roles: TeamAccess['roles']): TeamAccess => ({ isAdmin: false, roles });
const ids = (access: TeamAccess & { canSeePaperHub?: boolean }) =>
	teamRoutesFor(access).map((route) => route.id);
const route = (id: string) => {
	const found = teamRoutes.find((entry) => entry.id === id);
	if (!found) throw new Error(`no route ${id}`);
	return found;
};

describe('the registry', () => {
	test('has unique ids and paths', () => {
		expect(new Set(teamRoutes.map((entry) => entry.id)).size).toBe(teamRoutes.length);
		expect(new Set(teamRoutes.map((entry) => entry.path)).size).toBe(teamRoutes.length);
	});

	test('keeps every team page under /team, apart from the paper hub', () => {
		for (const entry of teamRoutes) {
			expect(entry.id === 'paperHub' || entry.path.startsWith('team/')).toBe(true);
		}
	});
});

describe('who sees what', () => {
	test('a system admin sees every page', () => {
		const admin = { isAdmin: true, roles: [] };
		expect(ids(admin)).toEqual(teamRoutes.map((entry) => entry.id));
	});

	test('nobody off the team sees a thing, though the paper hub is shared', () => {
		expect(ids(NO_TEAM_ACCESS)).toEqual([]);
		expect(ids({ ...NO_TEAM_ACCESS, canSeePaperHub: true })).toEqual(['paperHub']);
	});

	test('every team member gets the scanner', () => {
		for (const role of ['REVIEWER', 'MEMBER', 'TEAM_COORDINATOR', 'CONTENT_LEAD'] as const) {
			expect(ids(as(role))).toContain('attendance');
		}
	});

	test('the settings are only listed for roles that can change something in them', () => {
		for (const role of ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE', 'CONTENT_LEAD'] as const) {
			expect(ids(as(role))).toContain('settings');
		}
		for (const role of ['REVIEWER', 'MEMBER', 'TEAM_COORDINATOR'] as const) {
			expect(ids(as(role))).not.toContain('settings');
		}
	});

	test('the content lead plans seats but sees none of the care pages', () => {
		expect(ids(as('CONTENT_LEAD'))).toEqual(['stats', 'settings', 'seatPlanning', 'attendance']);
	});

	test('a team coordinator also manages the team', () => {
		expect(ids(as('TEAM_COORDINATOR'))).toEqual(['stats', 'members', 'attendance']);
	});

	test('participant care has the care pages but not the seat planning or the team', () => {
		const care = ids(as('PARTICIPANT_CARE'));
		expect(care).toContain('payments');
		expect(care).not.toContain('seatPlanning');
		expect(care).not.toContain('members');
	});

	test('the navigation sections leave out what is empty', () => {
		const sections = groupedTeamRoutes(as('CONTENT_LEAD')).map((section) => section.group);
		expect(sections).toEqual(['main', 'workflows']);
	});
});

describe('teamRouteForPath', () => {
	test('finds a page and the pages below it', () => {
		expect(teamRouteForPath('team/participants')?.id).toBe('participants');
		expect(teamRouteForPath('team/user/abc')?.id).toBe('participants');
		expect(teamRouteForPath('team/configuration/committees')?.id).toBe('settings');
		expect(teamRouteForPath('team/assignment/finish')?.id).toBe('assignment');
		expect(teamRouteForPath('team/invitations')?.id).toBe('members');
		expect(teamRouteForPath('team/survey/xyz')?.id).toBe('survey');
	});

	test('does not mistake a similarly named path for a page', () => {
		expect(teamRouteForPath('team/seat-planning-x')).toBeUndefined();
		expect(teamRouteForPath('team/seats')?.id).toBe('seats');
	});

	test('has no entry for the overview itself', () => {
		expect(teamRouteForPath('team')).toBeUndefined();
	});

	test('the guard and the navigation agree', () => {
		expect(mayOpenTeamRoute({ route: route('seatPlanning'), access: as('PARTICIPANT_CARE') })).toBe(
			false
		);
		expect(mayOpenTeamRoute({ route: route('seatPlanning'), access: as('CONTENT_LEAD') })).toBe(
			true
		);
	});
});
