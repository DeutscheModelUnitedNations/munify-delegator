import { m } from '#lib/paraglide/messages.js';
import type { TeamroleEnum } from '#lib/api/rumbleClient/client.js';
import { hasAnyRole, isOnTeam, type TeamAccess } from '#lib/helpers/teamAccess.js';
import {
	CONFERENCE_CONTENT_ROLES,
	PARTICIPANT_CARE_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles.js';

/**
 * Every page of a conference's team area, once. The side navigation, the dashboard's team entry, the command
 * palette and the route guard are all read from this list, so a page cannot be in one and
 * missing from another, and who may open it is stated in one place (and is the same answer
 * everywhere).
 *
 * Paths are relative to `/dashboard/[conferenceId]/`. The guard in `team/+layout.ts` finds the
 * entry owning the requested path; a path no entry owns needs any team role.
 */

/** The sections of the navigation, in the order they appear. */
const TEAM_ROUTE_GROUPS = ['main', 'workflows', 'info', 'maintenance'] as const;
export type TeamRouteGroup = (typeof TEAM_ROUTE_GROUPS)[number];

export const teamRouteGroupTitle: Record<TeamRouteGroup, () => string> = {
	main: () => m.team(),
	workflows: () => m.navWorkflows(),
	info: () => m.navInfo(),
	maintenance: () => m.navMaintenance()
};

export interface TeamRoute {
	id: string;
	/** Where it links to, relative to the conference's dashboard */
	path: string;
	/** Further paths this entry owns, for the guard and for highlighting the open entry */
	owns?: readonly string[];
	title: () => string;
	description?: () => string;
	/** FontAwesome name, with the `fa-` prefix */
	icon: string;
	group: TeamRouteGroup;
	/** Command palette category and search words */
	category: 'management' | 'tables' | 'workflows' | 'communication' | 'maintenance';
	keywords: readonly string[];
	/** Team roles that may open it. Absent: any team role. System admins always may. */
	roles?: readonly TeamroleEnum[];
	/** Needs more than roles, such as the paper hub, which participants use too */
	extraAccess?: (access: TeamAccess & { canSeePaperHub?: boolean }) => boolean;
}

const teamPath = (page: string) => `team/${page}`;

export const teamRoutes: readonly TeamRoute[] = [
	{
		id: 'stats',
		path: teamPath('stats'),
		title: () => m.adminStats(),
		icon: 'fa-chart-pie',
		group: 'main',
		category: 'management',
		keywords: ['statistik', 'statistics', 'übersicht', 'overview', 'zahlen', 'numbers']
	},
	{
		id: 'settings',
		path: teamPath('configuration'),
		title: () => m.settings(),
		description: () => m.manageConference(),
		icon: 'fa-gears',
		group: 'main',
		category: 'management',
		keywords: [
			'einstellungen',
			'settings',
			'konfiguration',
			'configuration',
			'konferenz',
			'conference'
		],
		// Everyone who can change something in there: the settings (project management), the
		// content (+ participant care, content lead) and the committees (+ content lead).
		roles: CONFERENCE_CONTENT_ROLES
	},
	{
		id: 'seats',
		path: teamPath('seats'),
		title: () => m.seats(),
		icon: 'fa-chair-office',
		group: 'main',
		category: 'management',
		keywords: ['plätze', 'seats', 'gremien', 'committees', 'nationen', 'nations'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'participants',
		path: teamPath('participants'),
		owns: [teamPath('user')],
		title: () => m.adminUsers(),
		icon: 'fa-users',
		group: 'main',
		category: 'tables',
		keywords: ['teilnehmende', 'participants', 'nutzer', 'users', 'personen'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'waitingList',
		path: teamPath('waiting-list'),
		title: () => m.waitingList(),
		icon: 'fa-user-clock',
		group: 'main',
		category: 'tables',
		keywords: ['warteliste', 'waiting list', 'nachrücker', 'wartend'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'schools',
		path: teamPath('schools'),
		title: () => m.schools(),
		icon: 'fa-school',
		group: 'main',
		category: 'tables',
		keywords: ['schulen', 'schools', 'schule', 'school', 'institution'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'members',
		path: teamPath('members'),
		owns: [teamPath('invitations')],
		title: () => m.teamManagement(),
		description: () => m.teamCoordinationDescription(),
		icon: 'fa-user-group',
		group: 'main',
		category: 'management',
		keywords: ['team', 'verwaltung', 'management', 'mitglieder', 'members'],
		roles: TEAM_ADMIN_ROLES
	},
	{
		// The paper hub is shared with participants and supervisors, so it stays at its own path
		// and has its own rule on top of the team roles.
		id: 'paperHub',
		path: 'paperhub',
		title: () => m.paperHub(),
		description: () => m.reviewPapers(),
		icon: 'fa-files',
		group: 'main',
		category: 'management',
		keywords: ['paper', 'papiere', 'resolution', 'resolutionen', 'review'],
		extraAccess: (access) => !!access.canSeePaperHub
	},
	{
		id: 'seatPlanning',
		path: teamPath('seat-planning'),
		title: () => m.seatPlanning(),
		description: () => m.seatPlanningDescription(),
		icon: 'fa-table-cells',
		group: 'workflows',
		category: 'management',
		keywords: ['sitzplanung', 'seat planning', 'sitzverteilung', 'matrix', 'gremien', 'staaten'],
		roles: SEAT_PLANNING_ROLES
	},
	{
		id: 'assignment',
		// The assignment has no page of its own; the sighting is where the work starts.
		path: teamPath('assignment/sighting'),
		owns: [teamPath('assignment')],
		title: () => m.adminAssignment(),
		icon: 'fa-shuffle',
		group: 'workflows',
		category: 'workflows',
		keywords: ['zuweisung', 'assignment', 'zuteilen', 'verteilen', 'assign'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'checkIn',
		path: teamPath('check-in'),
		title: () => m.onSiteCheckIn(),
		icon: 'fa-id-badge',
		group: 'workflows',
		category: 'workflows',
		keywords: ['anmeldung', 'check-in', 'namensschild', 'nametag', 'einlass', 'tische'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'postalRegistration',
		path: teamPath('postal-registration'),
		title: () => m.postalRegistration(),
		icon: 'fa-envelope',
		group: 'workflows',
		category: 'workflows',
		keywords: ['postalische anmeldung', 'postal registration', 'brief', 'post', 'dokumente'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'payments',
		path: teamPath('payments'),
		title: () => m.payment(),
		icon: 'fa-money-bill-transfer',
		group: 'workflows',
		category: 'workflows',
		keywords: ['zahlung', 'payment', 'geld', 'money', 'überweisung', 'transfer', 'bezahlung'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'attendance',
		path: teamPath('attendance'),
		title: () => m.attendanceScanner(),
		description: () => m.attendanceScannerDescription(),
		icon: 'fa-barcode-read',
		group: 'workflows',
		category: 'workflows',
		keywords: [
			'anwesenheit',
			'attendance',
			'scanner',
			'scan',
			'badge',
			'barcode',
			'zugang',
			'access',
			'einlass',
			'check-in',
			'zugangskontrolle',
			'ausweis'
		]
	},
	{
		id: 'announcement',
		path: teamPath('announcement'),
		title: () => m.announcementSectionTitle(),
		icon: 'fa-bullhorn',
		group: 'info',
		category: 'communication',
		keywords: ['ankündigungen', 'announcements', 'nachrichten', 'messages', 'mitteilungen'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'calendar',
		path: teamPath('calendar'),
		title: () => m.calendar(),
		icon: 'fa-calendar-days',
		group: 'info',
		category: 'communication',
		keywords: ['kalender', 'calendar', 'zeitplan', 'schedule', 'termine', 'events'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'survey',
		path: teamPath('survey'),
		title: () => m.survey(),
		icon: 'fa-chart-pie',
		group: 'info',
		category: 'communication',
		keywords: ['umfrage', 'survey', 'abstimmung', 'poll', 'fragebogen'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'plausibility',
		path: teamPath('plausibility'),
		title: () => m.adminPlausibility(),
		icon: 'fa-shield-check',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['plausibilität', 'plausibility', 'prüfung', 'check', 'validierung'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'cleanup',
		path: teamPath('cleanup'),
		title: () => m.cleanup(),
		icon: 'fa-broom',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['aufräumen', 'cleanup', 'bereinigen', 'clean'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'helper',
		path: teamPath('helper'),
		title: () => m.helper(),
		icon: 'fa-gear-code',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['helfer', 'helper', 'werkzeuge', 'tools', 'hilfsmittel'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'import',
		path: teamPath('import'),
		title: () => m.import(),
		icon: 'fa-file-import',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['import', 'importieren', 'daten', 'data', 'hochladen', 'upload'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'downloads',
		path: teamPath('downloads'),
		title: () => m.downloads(),
		icon: 'fa-download',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['downloads', 'herunterladen', 'export', 'exportieren'],
		roles: PARTICIPANT_CARE_ROLES
	}
];

/** The public seats overview, which the dashboard offers next to its team entry */
export const publicSeatsPath = 'seats';

/** The public schedule, which the team sees whatever the conference's calendar switch says */
export const publicCalendarPath = 'calendar';

/** Whether the caller may open one page */
export function mayOpenTeamRoute(
	route: TeamRoute,
	access: TeamAccess & { canSeePaperHub?: boolean }
): boolean {
	if (access.isAdmin) return true;
	if (route.extraAccess) return route.extraAccess(access);
	if (route.roles) return hasAnyRole(access, route.roles);
	return isOnTeam(access);
}

/** The pages the caller may open, in navigation order */
export function teamRoutesFor(access: TeamAccess & { canSeePaperHub?: boolean }): TeamRoute[] {
	return teamRoutes.filter((route) => mayOpenTeamRoute(route, access));
}

/** The visible pages grouped into the navigation's sections, empty sections left out */
export function groupedTeamRoutes(
	access: TeamAccess & { canSeePaperHub?: boolean }
): { group: TeamRouteGroup; routes: TeamRoute[] }[] {
	const visible = teamRoutesFor(access);
	return TEAM_ROUTE_GROUPS.map((group) => ({
		group,
		routes: visible.filter((route) => route.group === group)
	})).filter((section) => section.routes.length > 0);
}

/**
 * The entry owning a path (`pathname` relative to `/dashboard/[conferenceId]/`, so `team/stats`
 * or `team/user/abc`). The most specific match wins; `undefined` for a path no entry owns.
 */
export function teamRouteForPath(relativePath: string): TeamRoute | undefined {
	const normalized = relativePath.replace(/^\/+|\/+$/g, '');
	let best: { route: TeamRoute; length: number } | undefined;
	for (const route of teamRoutes) {
		for (const owned of [route.path, ...(route.owns ?? [])]) {
			const matches = normalized === owned || normalized.startsWith(`${owned}/`);
			if (matches && (!best || owned.length > best.length)) best = { route, length: owned.length };
		}
	}
	return best?.route;
}
