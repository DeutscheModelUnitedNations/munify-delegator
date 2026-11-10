import type { RouteId } from '$app/types';
import {
	tourAnchorSelector,
	type RouteHelp,
	type Tour
} from '@deutschemodelunitednations/docs-kit';
import { REGISTRATION_CHOICE_ANCHOR } from './tours/anchors';

// Loaded only when a tour starts, so the tours' copy is not in every page's bundle
const registrationChoiceTour = async () =>
	(await import('./tours/registrationChoice.tour')).registrationChoiceTour;
const participantDashboardTour = async () =>
	(await import('./tours/participantDashboard.tour')).participantDashboardTour;

/** The conference dashboard shows the registration choice to anyone without a part in it. */
function dashboardTour(): Promise<Tour> {
	return document.querySelector(tourAnchorSelector(REGISTRATION_CHOICE_ANCHOR))
		? registrationChoiceTour()
		: participantDashboardTour();
}

/**
 * The manual page (and section) and the tour the help button offers on each route. Keyed by
 * `RouteId`, so renaming or removing a route breaks the typecheck until this map follows;
 * `docs.test.ts` fails when a page or section named here does not exist. A route without an
 * entry gets the manual's start page.
 */
export const routeHelp: Partial<Record<RouteId, RouteHelp>> = {
	// Participants: registration. Applying itself happens on the conference dashboard, where the
	// old registration links redirect to.
	'/(authenticated)/registration': { docs: 'user-manual/participant/registration' },
	'/(authenticated)/registration/[conferenceId]/supervisor': {
		docs: 'user-manual/participant/registration#registering-as-a-supervisor'
	},
	'/(authenticated)/registration/[conferenceId]/waiting-list': {
		docs: 'user-manual/participant/registration#the-waiting-list'
	},

	// Participants: the conference dashboard
	'/(authenticated)/dashboard': { docs: 'user-manual/introduction' },
	// Someone without a part in the conference sees the registration choice here instead
	'/(authenticated)/dashboard/[conferenceId]': {
		docs: 'user-manual/participant/dashboard',
		tour: dashboardTour
	},
	'/(authenticated)/dashboard/[conferenceId]/payment': {
		docs: 'user-manual/participant/dashboard#payment'
	},
	'/(authenticated)/dashboard/[conferenceId]/postal-registration': {
		docs: 'user-manual/participant/dashboard#postal-registration'
	},
	'/(authenticated)/dashboard/[conferenceId]/committee-assignment': {
		docs: 'user-manual/participant/dashboard#committee-assignment'
	},
	'/(authenticated)/dashboard/[conferenceId]/info': {
		docs: 'user-manual/participant/dashboard#conference-information'
	},
	'/(authenticated)/dashboard/[conferenceId]/calendar': {
		docs: 'user-manual/participant/dashboard#schedule'
	},

	// Team: settings
	'/(authenticated)/dashboard/[conferenceId]/team/configuration': {
		docs: 'user-manual/team/configuration'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/configuration/committees': {
		docs: 'user-manual/team/configuration#committees-and-seats'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/seat-planning': {
		docs: 'user-manual/team/configuration#seat-planning'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/emails': {
		docs: 'user-manual/team/configuration#emails'
	},

	// Team: assignment
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/introduction': {
		docs: 'user-manual/team/assignment'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting': {
		docs: 'user-manual/team/assignment#sighting'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/weighting': {
		docs: 'user-manual/team/assignment#weighting'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/delegations': {
		docs: 'user-manual/team/assignment#delegations'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/singles': {
		docs: 'user-manual/team/assignment#single-participants'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/finish': {
		docs: 'user-manual/team/assignment#finish-and-release'
	},

	// Team: AI assistants
	'/(authenticated)/dashboard/[conferenceId]/team/ai-access': {
		docs: 'user-manual/team/ai-access'
	}
};

/** The manual's start page, for routes without help of their own */
export const DEFAULT_HELP_DOCS = 'user-manual/introduction';
