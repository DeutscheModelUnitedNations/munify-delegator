import { m } from '#lib/paraglide/messages.js';

/**
 * What each URL segment is called in the breadcrumbs, and its icon. Keyed by the segment as the
 * route folder is named (a `[param]` folder by its name without the brackets). Every segment of
 * every page has to be here: `breadcrumbs.test.ts` fails for one that is missing.
 */
export interface LocalizedBreadcrumb {
	translation: () => string;
	icon: string;
}

export const breadcrumbs: Record<string, LocalizedBreadcrumb> = {
	newResolution: { translation: () => m.newResolution(), icon: 'file-signature' },
	snippets: { translation: () => m.snippets(), icon: 'bookmark' },
	'conference-request': { translation: () => m.conferenceRequest(), icon: 'file-pen' },
	team: {
		translation: () => m.team(),
		icon: 'bars-progress'
	},
	members: {
		translation: () => m.teamMembers(),
		icon: 'users'
	},
	invitations: {
		translation: () => m.pendingInvitations(),
		icon: 'envelope'
	},
	delegations: {
		translation: () => m.delegations(),
		icon: 'users-viewfinder'
	},
	dashboard: {
		translation: () => m.conferences(),
		icon: 'grid-2'
	},
	registration: {
		translation: () => m.registration(),
		icon: 'envelope'
	},
	stats: {
		translation: () => m.statistics(),
		icon: 'chart-simple'
	},
	'create-delegation': {
		translation: () => m.createDelegation(),
		icon: 'plus'
	},
	'join-delegation': {
		translation: () => m.joinDelegation(),
		icon: 'arrow-right-to-arc'
	},
	individual: {
		translation: () => m.individualApplication(),
		icon: 'dice-one'
	},
	roleId: {
		translation: () => m.role(),
		icon: 'gavel'
	},
	supervisor: {
		translation: () => m.supervisor(),
		icon: 'eye'
	},
	'my-account': {
		translation: () => m.myAccount(),
		icon: 'user'
	},
	configuration: {
		translation: () => m.settings(),
		icon: 'gears'
	},
	participants: {
		translation: () => m.participants(),
		icon: 'users'
	},
	individuals: {
		translation: () => m.singleParticipants(),
		icon: 'user'
	},
	supervisors: {
		translation: () => m.supervisors(),
		icon: 'chalkboard-user'
	},
	plausibility: {
		translation: () => m.adminPlausibility(),
		icon: 'shield-check'
	},
	seats: {
		translation: () => m.seats(),
		icon: 'chair-office'
	},
	'seat-planning': {
		translation: () => m.seatPlanning(),
		icon: 'table-cells'
	},
	'committee-assignment': {
		translation: () => m.committeeAssignment(),
		icon: 'arrows-turn-to-dots'
	},
	info: {
		translation: () => m.infos(),
		icon: 'info'
	},
	payment: {
		translation: () => m.payment(),
		icon: 'hand-holding-circle-dollar'
	},
	'check-in': {
		translation: () => m.onSiteCheckIn(),
		icon: 'id-badge'
	},
	'postal-registration': {
		translation: () => m.postalRegistration(),
		icon: 'envelopes-bulk'
	},
	group: {
		translation: () => m.groupPayment(),
		icon: 'people-group'
	},
	delegation: {
		translation: () => m.delegationPayment(),
		icon: 'users-viewfinder'
	},
	single: {
		translation: () => m.singlePayment(),
		icon: 'user'
	},
	payments: {
		translation: () => m.payment(),
		icon: 'money-bill-transfer'
	},
	cleanup: {
		icon: 'broom',
		translation: () => m.cleanup()
	},
	downloads: {
		icon: 'download',
		translation: () => m.downloads()
	},
	calendar: {
		icon: 'calendar-days',
		translation: () => m.calendar()
	},
	survey: {
		icon: 'square-poll-horizontal',
		translation: () => m.survey()
	},
	surveyId: {
		icon: 'magnifying-glass',
		translation: () => m.details()
	},
	helper: {
		icon: 'gear-code',
		translation: () => m.helper()
	},
	import: {
		icon: 'file-import',
		translation: () => m.import()
	},
	'connect-supervisor': {
		icon: 'eye',
		translation: () => m.connectSupervisorTitle()
	},
	create: {
		icon: 'seedling',
		translation: () => m.seedConference()
	},
	committees: {
		icon: 'podium',
		translation: () => m.committees()
	},
	'waiting-list': {
		icon: 'user-clock',
		translation: () => m.waitingList()
	},
	schools: {
		icon: 'school',
		translation: () => m.schools()
	},
	schoolId: {
		icon: 'school-flag',
		translation: () => m.school()
	},
	introduction: {
		icon: 'circle-info',
		translation: () => m.assignmentTabIntroduction()
	},
	sighting: {
		icon: 'binoculars',
		translation: () => m.sightings()
	},
	weighting: {
		icon: 'scale-unbalanced',
		translation: () => m.weighting()
	},
	singles: {
		icon: 'user',
		translation: () => m.singleParticipants()
	},
	assignment: {
		icon: 'arrows-turn-to-dots',
		translation: () => m.assignment()
	},
	summary: {
		icon: 'file-chart-column',
		translation: () => m.summary()
	},
	finish: {
		icon: 'flag-checkered',
		translation: () => m.assignmentTabFinish()
	},
	paperhub: {
		icon: 'files',
		translation: () => m.paperHub()
	},
	paperId: {
		icon: 'file-magnifying-glass',
		translation: () => m.paper()
	},
	newPaper: {
		icon: 'file-circle-plus',
		translation: () => m.newPaper()
	},
	view: {
		icon: 'eye',
		translation: () => m.view()
	},
	'registration-mode': {
		icon: 'id-card',
		translation: () => m.registrationMode()
	},
	announcement: {
		icon: 'bullhorn',
		translation: () => m.announcementSectionTitle()
	},
	emails: {
		icon: 'envelope',
		translation: () => m.emailSettingsTab()
	},
	attendance: {
		icon: 'barcode-read',
		translation: () => m.attendanceScanner()
	},
	'team-tender': {
		icon: 'bullhorn',
		translation: () => m.teamTenderTitle()
	},
	user: {
		icon: 'users',
		translation: () => m.participants()
	},
	userId: {
		icon: 'user',
		translation: () => m.adminUserCard()
	}
};

/**
 * The path segments of a page file, as the page glob in `Breadcrumbs.svelte` names it
 * (`./dashboard/[conferenceId]/team/stats/+page.svelte`). Mirrors what sveltekit-breadcrumbs does
 * with the same keys, so the two agree on which pages exist.
 */
export function pageSegments(globKey: string): string[] {
	let path = globKey.replace('.svelte', '').replace('./', '/');
	// for group layouts: the library keeps what follows the first group
	if (path.includes('/(')) path = path.substring(path.indexOf(')/') + 1);
	return path
		.replace(/^\//, '')
		.replace('/+page', '')
		.split('/')
		.filter((segment) => segment !== '');
}

const isParameter = (segment: string) => segment.startsWith('[') && segment.endsWith(']');

/** Whether some page file answers exactly this URL path (`[param]` folders match any segment) */
export function hasPageAt(urlSegments: readonly string[], globKeys: readonly string[]): boolean {
	return matchPage(urlSegments, globKeys) !== undefined;
}

/**
 * The page files with the static routes ahead of the `[param]` ones at the first segment where
 * they differ. sveltekit-breadcrumbs takes the first page that fits a URL, so `dashboard/create`
 * would otherwise be read as `dashboard/[conferenceId]` and `paperhub/newPaper` as
 * `paperhub/[paperId]`, and show the wrong crumb.
 */
export function staticFirst<T extends string>(globKeys: readonly T[]): T[] {
	return globKeys.toSorted((a, b) => {
		const left = pageSegments(a);
		const right = pageSegments(b);
		for (let index = 0; index < Math.min(left.length, right.length); index++) {
			if (left[index] === right[index]) continue;
			const leftParam = isParameter(left[index]);
			const rightParam = isParameter(right[index]);
			if (leftParam !== rightParam) return leftParam ? 1 : -1;
			return left[index] < right[index] ? -1 : 1;
		}
		return left.length - right.length;
	});
}

/**
 * The page file the breadcrumbs resolve a URL path to: the first one whose every segment is the
 * same or a `[param]`, the way sveltekit-breadcrumbs picks it. `undefined` for a URL with no page.
 */
export function matchPage(
	urlSegments: readonly string[],
	globKeys: readonly string[]
): string | undefined {
	return globKeys.find((key) => {
		const segments = pageSegments(key);
		return (
			segments.length === urlSegments.length &&
			segments.every((segment, index) => isParameter(segment) || segment === urlSegments[index])
		);
	});
}
