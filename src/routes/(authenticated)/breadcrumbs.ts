import { m } from '#lib/paraglide/messages';

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
	newResolution: { translation: () => m.newResolution(), icon: 'signature' },
	snippets: { translation: () => m.snippets(), icon: 'bookmark-simple' },
	'conference-request': { translation: () => m.conferenceRequest(), icon: 'note-pencil' },
	team: {
		translation: () => m.team(),
		icon: 'chart-bar-horizontal'
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
		icon: 'user-focus'
	},
	dashboard: {
		translation: () => m.conferences(),
		icon: 'squares-four'
	},
	registration: {
		translation: () => m.registration(),
		icon: 'envelope'
	},
	stats: {
		translation: () => m.statistics(),
		icon: 'chart-bar'
	},
	'create-delegation': {
		translation: () => m.createDelegation(),
		icon: 'plus'
	},
	'join-delegation': {
		translation: () => m.joinDelegation(),
		icon: 'sign-in'
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
		icon: 'gear-six'
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
		icon: 'chalkboard-teacher'
	},
	plausibility: {
		translation: () => m.adminPlausibility(),
		icon: 'shield-check'
	},
	seats: {
		translation: () => m.seats(),
		icon: 'chair'
	},
	'seat-planning': {
		translation: () => m.seatPlanning(),
		icon: 'table'
	},
	'committee-assignment': {
		translation: () => m.committeeAssignment(),
		icon: 'arrows-split'
	},
	info: {
		translation: () => m.infos(),
		icon: 'info'
	},
	payment: {
		translation: () => m.payment(),
		icon: 'hand-coins'
	},
	'check-in': {
		translation: () => m.onSiteCheckIn(),
		icon: 'identification-badge'
	},
	'postal-registration': {
		translation: () => m.postalRegistration(),
		icon: 'envelope-simple'
	},
	payments: {
		translation: () => m.payment(),
		icon: 'money-wavy'
	},
	cleanup: {
		icon: 'broom',
		translation: () => m.cleanup()
	},
	downloads: {
		icon: 'download-simple',
		translation: () => m.downloads()
	},
	'ai-access': {
		icon: 'robot',
		translation: () => m.aiAccess()
	},
	messages: {
		icon: 'chats-circle',
		translation: () => m.chatMessages()
	},
	calendar: {
		icon: 'calendar-dots',
		translation: () => m.calendar()
	},
	survey: {
		icon: 'chart-bar-horizontal',
		translation: () => m.survey()
	},
	surveyId: {
		icon: 'magnifying-glass',
		translation: () => m.details()
	},
	helper: {
		icon: 'gear-fine',
		translation: () => m.helper()
	},
	import: {
		icon: 'file-arrow-up',
		translation: () => m.import()
	},
	create: {
		icon: 'plant',
		translation: () => m.seedConference()
	},
	'chase-link': {
		icon: 'link',
		translation: () => m.chaseLinkTitle()
	},
	committees: {
		icon: 'lectern',
		translation: () => m.committees()
	},
	'waiting-list': {
		icon: 'clock-user',
		translation: () => m.waitingList()
	},
	schools: {
		icon: 'graduation-cap',
		translation: () => m.schools()
	},
	schoolId: {
		icon: 'graduation-cap',
		translation: () => m.school()
	},
	introduction: {
		icon: 'info',
		translation: () => m.assignmentTabIntroduction()
	},
	sighting: {
		icon: 'binoculars',
		translation: () => m.sightings()
	},
	weighting: {
		icon: 'scales',
		translation: () => m.weighting()
	},
	singles: {
		icon: 'user',
		translation: () => m.singleParticipants()
	},
	assignment: {
		icon: 'arrows-split',
		translation: () => m.assignment()
	},
	summary: {
		icon: 'file-text',
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
		icon: 'file-plus',
		translation: () => m.newPaper()
	},
	view: {
		icon: 'eye',
		translation: () => m.view()
	},
	'registration-mode': {
		icon: 'identification-card',
		translation: () => m.registrationMode()
	},
	announcement: {
		icon: 'megaphone',
		translation: () => m.announcementSectionTitle()
	},
	emails: {
		icon: 'envelope',
		translation: () => m.emailSettingsTab()
	},
	attendance: {
		icon: 'barcode',
		translation: () => m.attendanceScanner()
	},
	'team-tender': {
		icon: 'megaphone',
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
export function hasPageAt({
	urlSegments,
	globKeys
}: {
	urlSegments: readonly string[];
	globKeys: readonly string[];
}): boolean {
	return matchPage({ urlSegments, globKeys }) !== undefined;
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
export function matchPage({
	urlSegments,
	globKeys
}: {
	urlSegments: readonly string[];
	globKeys: readonly string[];
}): string | undefined {
	return globKeys.find((key) => {
		const segments = pageSegments(key);
		return (
			segments.length === urlSegments.length &&
			segments.every((segment, index) => isParameter(segment) || segment === urlSegments[index])
		);
	});
}
