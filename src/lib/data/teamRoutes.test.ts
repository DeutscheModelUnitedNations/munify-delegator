import { describe, expect, test } from 'vitest';
import {
	firstTeamPagePath,
	groupedTeamRoutes,
	mayOpenTeamRoute,
	teamRelativePath,
	teamRouteForPath,
	teamRoutes,
	teamRoutesFor
} from './teamRoutes';
import { canManageEmails, NO_TEAM_ACCESS, type TeamAccess } from '#lib/helpers/teamAccess';

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

	test('the e-mail page is for whoever manages the mails, under communication', () => {
		for (const role of ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const) {
			expect(ids(as(role))).toContain('emails');
			expect(canManageEmails(as(role))).toBe(true);
		}
		for (const role of ['CONTENT_LEAD', 'REVIEWER', 'MEMBER', 'TEAM_COORDINATOR'] as const) {
			expect(ids(as(role))).not.toContain('emails');
			expect(canManageEmails(as(role))).toBe(false);
		}
		expect(route('emails').group).toBe('info');
		expect(teamRouteForPath('team/emails')?.id).toBe('emails');
	});

	test('the content lead plans seats and writes announcements but sees none of the care pages', () => {
		expect(ids(as('CONTENT_LEAD'))).toEqual([
			'stats',
			'settings',
			'seatPlanning',
			'attendance',
			'announcement',
			'messages'
		]);
	});

	test('a team coordinator also manages the team', () => {
		expect(ids(as('TEAM_COORDINATOR'))).toEqual(['stats', 'members', 'attendance', 'messages']);
	});

	test('participant care has the care pages but not the seat planning or the team', () => {
		const care = ids(as('PARTICIPANT_CARE'));
		expect(care).toContain('payments');
		expect(care).not.toContain('seatPlanning');
		expect(care).not.toContain('members');
	});

	test('the navigation sections leave out what is empty', () => {
		const sections = groupedTeamRoutes(as('CONTENT_LEAD')).map((section) => section.group);
		// nothing of the maintenance section is the content lead's
		expect(sections).toEqual(['main', 'workflows', 'info']);
	});

	test('the messages page is open to the whole team: who answers an inbox follows functions', () => {
		for (const role of ['MEMBER', 'REVIEWER', 'PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] as const) {
			expect(ids(as(role))).toContain('messages');
		}
		expect(route('messages').group).toBe('info');
		expect(teamRouteForPath('team/messages')?.id).toBe('messages');
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

describe('teamRelativePath', () => {
	const conferenceId = 'conf-1';

	test('is the path below the conference dashboard', () => {
		expect(teamRelativePath({ pathname: '/dashboard/conf-1/team/stats', conferenceId })).toBe(
			'team/stats'
		);
		expect(teamRelativePath({ pathname: '/dashboard/conf-1/team/user/u1/', conferenceId })).toBe(
			'team/user/u1'
		);
	});

	test('ignores a locale prefix, which page.url keeps', () => {
		expect(teamRelativePath({ pathname: '/en/dashboard/conf-1/team/stats', conferenceId })).toBe(
			'team/stats'
		);
		expect(
			teamRouteForPath(
				teamRelativePath({ pathname: '/en/dashboard/conf-1/team/seats', conferenceId })
			)?.id
		).toBe('seats');
	});

	test('is empty for the dashboard itself and for another conference', () => {
		expect(teamRelativePath({ pathname: '/dashboard/conf-1', conferenceId })).toBe('');
		expect(teamRelativePath({ pathname: '/dashboard/conf-1/', conferenceId })).toBe('');
		expect(teamRelativePath({ pathname: '/dashboard/conf-12/team/stats', conferenceId })).toBe('');
		expect(teamRelativePath({ pathname: '/dashboard/other/team/stats', conferenceId })).toBe('');
	});
});

describe('firstTeamPagePath', () => {
	test('is the first team page the caller may open, in registry order', () => {
		for (const access of [as('PARTICIPANT_CARE'), as('REVIEWER'), { isAdmin: true, roles: [] }]) {
			const first = teamRoutesFor(access).find((entry) => entry.path.startsWith('team/'));
			expect(firstTeamPagePath(access)).toBe(first?.path);
			expect(firstTeamPagePath(access)?.startsWith('team/')).toBe(true);
		}
	});

	test('is undefined for someone not on the team', () => {
		expect(firstTeamPagePath(NO_TEAM_ACCESS)).toBeUndefined();
	});
});
