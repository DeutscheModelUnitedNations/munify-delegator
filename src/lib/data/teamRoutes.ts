import { m } from '#lib/paraglide/messages';
import type { TeamroleEnum } from '#lib/api/rumbleClient/client';
import { PAGE_SKELETON, type SkeletonLayout } from '#lib/components/navigation/skeletonShapes';
import { TEAM_SKELETONS, teamSubpageSkeleton } from '#lib/data/teamSkeletons';
import { hasAnyRole, isOnTeam, type TeamAccess } from '#lib/helpers/teamAccess';
import {
	CONFERENCE_CONTENT_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles';

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
	/** What the page looks like, for the skeleton shown while it loads (`#lib/data/teamSkeletons`) */
	skeleton: SkeletonLayout;
}

const teamPath = (page: string) => `team/${page}`;

export const teamRoutes: readonly TeamRoute[] = [
	{
		id: 'stats',
		skeleton: TEAM_SKELETONS.stats,
		path: teamPath('stats'),
		title: () => m.adminStats(),
		icon: 'fa-chart-pie',
		group: 'main',
		category: 'management',
		keywords: ['statistik', 'statistics', 'übersicht', 'overview', 'zahlen', 'numbers']
	},
	{
		id: 'settings',
		skeleton: TEAM_SKELETONS.settings,
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
			'conference',
			'e-mails',
			'emails',
			'mails',
			'automatisch',
			'automatic',
			'benachrichtigung',
			'notification'
		],
		// Everyone who can change something in there: the settings (project management), the
		// content (+ participant care, content lead), the committees (+ content lead) and the
		// automatic mails (participant care).
		roles: CONFERENCE_CONTENT_ROLES
	},
	{
		id: 'seats',
		skeleton: TEAM_SKELETONS.seats,
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
		skeleton: TEAM_SKELETONS.participants,
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
		skeleton: TEAM_SKELETONS.waitingList,
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
		skeleton: TEAM_SKELETONS.schools,
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
		skeleton: TEAM_SKELETONS.members,
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
		skeleton: TEAM_SKELETONS.paperHub,
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
		skeleton: TEAM_SKELETONS.seatPlanning,
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
		// the sighting's; every tab has its own (`teamSkeletonForPath`)
		skeleton: TEAM_SKELETONS.assignment,
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
		skeleton: TEAM_SKELETONS.checkIn,
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
		skeleton: TEAM_SKELETONS.postalRegistration,
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
		skeleton: TEAM_SKELETONS.payments,
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
		skeleton: TEAM_SKELETONS.attendance,
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
		skeleton: TEAM_SKELETONS.announcement,
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
		skeleton: TEAM_SKELETONS.calendar,
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
		skeleton: TEAM_SKELETONS.survey,
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
		skeleton: TEAM_SKELETONS.plausibility,
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
		skeleton: TEAM_SKELETONS.cleanup,
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
		skeleton: TEAM_SKELETONS.helper,
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
		skeleton: TEAM_SKELETONS.import,
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
		skeleton: TEAM_SKELETONS.downloads,
		path: teamPath('downloads'),
		title: () => m.downloads(),
		icon: 'fa-download',
		group: 'maintenance',
		category: 'maintenance',
		keywords: ['downloads', 'herunterladen', 'export', 'exportieren'],
		roles: PARTICIPANT_CARE_ROLES
	},
	{
		id: 'aiAccess',
		skeleton: TEAM_SKELETONS.aiAccess,
		path: teamPath('ai-access'),
		title: () => m.aiAccess(),
		description: () => m.aiAccessDescription(),
		icon: 'fa-robot',
		group: 'maintenance',
		category: 'management',
		keywords: [
			'ki',
			'ai',
			'mcp',
			'claude',
			'chatgpt',
			'assistent',
			'assistant',
			'protokoll',
			'log'
		],
		roles: PROJECT_MANAGEMENT_ROLES
	}
];

/** The public seats overview, which the dashboard offers next to its team entry */
export const publicSeatsPath = 'seats';

/** The public schedule, which the team sees whatever the conference's calendar switch says */
export const publicCalendarPath = 'calendar';

/** Whether the caller may open one page */
export function mayOpenTeamRoute({
	route,
	access
}: {
	route: TeamRoute;
	access: TeamAccess & { canSeePaperHub?: boolean };
}): boolean {
	if (access.isAdmin) return true;
	if (route.extraAccess) return route.extraAccess(access);
	if (route.roles) return hasAnyRole({ access, roles: route.roles });
	return isOnTeam(access);
}

/** The pages the caller may open, in navigation order */
export function teamRoutesFor(access: TeamAccess & { canSeePaperHub?: boolean }): TeamRoute[] {
	return teamRoutes.filter((route) => mayOpenTeamRoute({ route, access }));
}

/**
 * Where the way into the team area leads: its first page the caller may open, since the area has
 * no landing page of its own. `undefined` when they may open none.
 */
export function firstTeamPagePath(access: TeamAccess): string | undefined {
	return teamRoutesFor(access).find((route) => route.path.startsWith('team/'))?.path;
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
 * A URL's path relative to the conference's dashboard: `team/stats` for
 * `/dashboard/<id>/team/stats`, and for `/en/dashboard/<id>/team/stats` too - Paraglide keeps the
 * locale prefix on `page.url`, which a plain `replace` of the dashboard prefix left in front.
 * An empty string for the dashboard itself, and for a path of another conference.
 */
export function teamRelativePath({
	pathname,
	conferenceId
}: {
	pathname: string;
	conferenceId: string;
}): string {
	const base = `/dashboard/${conferenceId}`;
	const start = pathname.indexOf(base);
	if (start === -1) return '';
	const rest = pathname.slice(start + base.length);
	if (rest !== '' && !rest.startsWith('/')) return '';
	return rest.replace(/^\/+|\/+$/g, '');
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

/**
 * The skeleton for a path relative to the conference's dashboard: the page's own where it has one
 * (a detail page, an assignment tab), else its entry's, else the generic one.
 */
export function teamSkeletonForPath(relativePath: string): SkeletonLayout {
	const normalized = relativePath.replace(/^\/+|\/+$/g, '');
	return teamSubpageSkeleton(normalized) ?? teamRouteForPath(normalized)?.skeleton ?? PAGE_SKELETON;
}
