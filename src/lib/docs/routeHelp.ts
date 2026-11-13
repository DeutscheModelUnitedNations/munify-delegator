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
	'/(authenticated)/dashboard': { docs: 'user-manual/participant/account#conference-overview' },
	'/(authenticated)/my-account': { docs: 'user-manual/participant/account#profile' },
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
	'/(authenticated)/dashboard/[conferenceId]/announcements': {
		docs: 'user-manual/participant/dashboard#conference-information'
	},
	'/(authenticated)/dashboard/[conferenceId]/calendar': {
		docs: 'user-manual/participant/dashboard#schedule'
	},

	'/(authenticated)/dashboard/[conferenceId]/registration-mode': {
		docs: 'user-manual/participant/dashboard#nametag'
	},
	'/(authenticated)/dashboard/[conferenceId]/check-in': {
		docs: 'user-manual/participant/dashboard#check-in'
	},
	'/(authenticated)/dashboard/[conferenceId]/seats': {
		docs: 'user-manual/team/configuration#public-seats'
	},

	// Participants: messages and papers
	'/(authenticated)/dashboard/[conferenceId]/messages': {
		docs: 'user-manual/participant/dashboard#messages'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub': {
		docs: 'user-manual/participant/paper-hub'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/newPaper': {
		docs: 'user-manual/participant/paper-hub#writing-a-paper'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/newResolution': {
		docs: 'user-manual/participant/paper-hub#working-papers'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]': {
		docs: 'user-manual/participant/paper-hub#drafts-and-submitting'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]': {
		docs: 'user-manual/participant/paper-hub#who-sees-what'
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/snippets': {
		docs: 'user-manual/team/paper-hub#snippets'
	},

	// System admins
	'/(authenticated)/dashboard/create': {
		docs: 'user-manual/team/configuration#creating-a-conference'
	},
	'/(authenticated)/dashboard/conference-request': {
		docs: 'user-manual/team/configuration#creating-a-conference'
	},
	'/(authenticated)/dashboard/chase-link': { docs: 'user-manual/team/overview#chase-link' },

	// Team: the team itself
	'/(authenticated)/dashboard/[conferenceId]/team/members': {
		docs: 'user-manual/team/overview#team-management'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/invitations': {
		docs: 'user-manual/team/overview#team-management'
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

	// Team: people
	'/(authenticated)/dashboard/[conferenceId]/team/participants': {
		docs: 'user-manual/team/participants#participants-table'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/user/[userId]': {
		docs: 'user-manual/team/participants#user-card'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/seats': {
		docs: 'user-manual/team/participants#seats'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/waiting-list': {
		docs: 'user-manual/team/participants#waiting-list'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/schools': {
		docs: 'user-manual/team/participants#schools'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/schools/[schoolId]': {
		docs: 'user-manual/team/participants#schools'
	},

	// Team: formalities and the conference on site
	'/(authenticated)/dashboard/[conferenceId]/team/payments': {
		docs: 'user-manual/team/formalities#payments'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/postal-registration': {
		docs: 'user-manual/team/formalities#postal-registration'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/check-in': {
		docs: 'user-manual/team/formalities#check-in'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/attendance': {
		docs: 'user-manual/team/formalities#scanner'
	},

	// Team: communication
	'/(authenticated)/dashboard/[conferenceId]/team/announcement': {
		docs: 'user-manual/team/communication#announcements'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/messages': {
		docs: 'user-manual/team/communication#messages'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/emails': {
		docs: 'user-manual/team/communication#emails'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/calendar': {
		docs: 'user-manual/team/communication#calendar'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/survey': {
		docs: 'user-manual/team/communication#surveys'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/survey/[surveyId]': {
		docs: 'user-manual/team/communication#surveys'
	},

	// Team: statistics and maintenance
	'/(authenticated)/dashboard/[conferenceId]/team/stats': {
		docs: 'user-manual/team/maintenance#statistics'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/plausibility': {
		docs: 'user-manual/team/maintenance#plausibility'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/cleanup': {
		docs: 'user-manual/team/maintenance#cleanup'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/helper': {
		docs: 'user-manual/team/maintenance#helper'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/import': {
		docs: 'user-manual/team/maintenance#import'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/downloads': {
		docs: 'user-manual/team/maintenance#downloads'
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
