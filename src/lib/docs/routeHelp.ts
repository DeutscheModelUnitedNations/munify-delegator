import type { RouteId } from '$app/types';
import {
	tourAnchorSelector,
	type RouteHelp,
	type Tour
} from '@deutschemodelunitednations/docs-kit';
import { REGISTRATION_CHOICE_ANCHOR } from './tours/anchors';

// Loaded only when a tour starts, so the tours' copy is not in every page's bundle. A team page's
// tour lives in `tours/team/<page>.tour.ts` and exports it as `<page>Tour`.
const registrationChoiceTour = async () =>
	(await import('./tours/registrationChoice.tour')).registrationChoiceTour;
const participantDashboardTour = async () =>
	(await import('./tours/participantDashboard.tour')).participantDashboardTour;

const onScreen = (anchor: string) => document.querySelector(tourAnchorSelector(anchor)) !== null;

/** The conference dashboard shows the registration choice to anyone without a part in it. */
function dashboardTour(): Promise<Tour> {
	return onScreen(REGISTRATION_CHOICE_ANCHOR)
		? registrationChoiceTour()
		: participantDashboardTour();
}

// The paper hub serves authors, supervisors and the team on the same routes, each with tours of
// their own (`tours/paperhub/`). Which one fits is read off the screen: the start page shows one
// view at a time, and a paper shows the review form only to a reviewer.
const paperhubTours = {
	team: async () => (await import('./tours/paperhub/paperhubTeam.tour')).paperhubTeamTour,
	supervisor: async () =>
		(await import('./tours/paperhub/paperhubSupervisor.tour')).paperhubSupervisorTour,
	global: async () =>
		(await import('./tours/paperhub/paperhubConferencePapers.tour')).paperhubConferencePapersTour,
	participant: async () =>
		(await import('./tours/paperhub/paperhubMyPapers.tour')).paperhubMyPapersTour
};

/** The tour of the paper hub view on screen; the participants' own papers when none is found */
function paperhubStartTour(): Promise<Tour> {
	if (onScreen('paperhub.view.team')) return paperhubTours.team();
	if (onScreen('paperhub.view.supervisor')) return paperhubTours.supervisor();
	if (onScreen('paperhub.view.global')) return paperhubTours.global();
	return paperhubTours.participant();
}

/** A paper: the reviewer's tour where the review form is, the author's (and supervisor's) otherwise */
async function paperTour(): Promise<Tour> {
	return onScreen('paperhub.review')
		? (await import('./tours/paperhub/paperhubReview.tour')).paperhubReviewTour
		: (await import('./tours/paperhub/paperhubAuthor.tour')).paperhubAuthorTour;
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
		docs: 'user-manual/participant/paper-hub',
		tour: paperhubStartTour
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/newPaper': {
		docs: 'user-manual/participant/paper-hub#writing-a-paper',
		tour: async () => (await import('./tours/paperhub/paperhubNewPaper.tour')).paperhubNewPaperTour
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/newResolution': {
		docs: 'user-manual/participant/paper-hub#working-papers',
		tour: async () =>
			(await import('./tours/paperhub/paperhubNewResolution.tour')).paperhubNewResolutionTour
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]': {
		docs: 'user-manual/participant/paper-hub#drafts-and-submitting',
		tour: paperTour
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]': {
		docs: 'user-manual/participant/paper-hub#who-sees-what',
		tour: async () => (await import('./tours/paperhub/paperhubView.tour')).paperhubViewTour
	},
	'/(authenticated)/dashboard/[conferenceId]/paperhub/snippets': {
		docs: 'user-manual/team/paper-hub#snippets',
		tour: async () => (await import('./tours/paperhub/paperhubSnippets.tour')).paperhubSnippetsTour
	},

	// System admins
	'/(authenticated)/dashboard/create': {
		docs: 'user-manual/team/configuration#creating-a-conference'
	},
	'/(authenticated)/dashboard/conference-request': {
		docs: 'user-manual/team/configuration#creating-a-conference'
	},
	'/(authenticated)/dashboard/chase-link': { docs: 'user-manual/team/overview#chase-link' },
	'/(authenticated)/dashboard/slack-workspaces': {
		docs: 'user-manual/team/overview#slack-workspaces'
	},
	'/(authenticated)/my-account/notifications': {
		docs: 'user-manual/team/communication#notifications'
	},
	'/(authenticated)/my-account/scanners': { docs: 'user-manual/team/formalities#scans' },

	// Team: the team itself
	'/(authenticated)/dashboard/[conferenceId]/team/members': {
		docs: 'user-manual/team/overview#team-management',
		tour: async () => (await import('./tours/team/members.tour')).membersTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/invitations': {
		docs: 'user-manual/team/overview#team-management',
		tour: async () => (await import('./tours/team/invitations.tour')).invitationsTour
	},

	// Team: settings
	'/(authenticated)/dashboard/[conferenceId]/team/configuration': {
		docs: 'user-manual/team/configuration',
		tour: async () => (await import('./tours/team/configuration.tour')).configurationTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/configuration/committees': {
		docs: 'user-manual/team/configuration#committees-and-seats',
		tour: async () => (await import('./tours/team/committees.tour')).committeesTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/seat-planning': {
		docs: 'user-manual/team/configuration#seat-planning',
		tour: async () => (await import('./tours/team/seatPlanning.tour')).seatPlanningTour
	},

	// Team: people
	'/(authenticated)/dashboard/[conferenceId]/team/participants': {
		docs: 'user-manual/team/participants#participants-table',
		tour: async () => (await import('./tours/team/participants.tour')).participantsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/user/[userId]': {
		docs: 'user-manual/team/participants#user-card',
		tour: async () => (await import('./tours/team/userCard.tour')).userCardTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/seats': {
		docs: 'user-manual/team/participants#seats',
		tour: async () => (await import('./tours/team/seats.tour')).seatsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/waiting-list': {
		docs: 'user-manual/team/participants#waiting-list',
		tour: async () => (await import('./tours/team/waitingList.tour')).waitingListTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/schools': {
		docs: 'user-manual/team/participants#schools',
		tour: async () => (await import('./tours/team/schools.tour')).schoolsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/schools/[schoolId]': {
		docs: 'user-manual/team/participants#schools',
		tour: async () => (await import('./tours/team/school.tour')).schoolTour
	},

	// Team: formalities and the conference on site
	'/(authenticated)/dashboard/[conferenceId]/team/payments': {
		docs: 'user-manual/team/formalities#payments',
		tour: async () => (await import('./tours/team/payments.tour')).paymentsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/postal-registration': {
		docs: 'user-manual/team/formalities#postal-registration',
		tour: async () => (await import('./tours/team/postalRegistration.tour')).postalRegistrationTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/check-in': {
		docs: 'user-manual/team/formalities#check-in',
		tour: async () => (await import('./tours/team/checkIn.tour')).checkInTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/attendance': {
		docs: 'user-manual/team/formalities#scanner',
		tour: async () => (await import('./tours/team/attendance.tour')).attendanceTour
	},

	// Team: communication
	'/(authenticated)/dashboard/[conferenceId]/team/announcement': {
		docs: 'user-manual/team/communication#announcements',
		tour: async () => (await import('./tours/team/announcement.tour')).announcementTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/messages': {
		docs: 'user-manual/team/communication#messages',
		tour: async () => (await import('./tours/team/messages.tour')).messagesTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/emails': {
		docs: 'user-manual/team/communication#emails',
		tour: async () => (await import('./tours/team/emails.tour')).emailsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/calendar': {
		docs: 'user-manual/team/communication#calendar',
		tour: async () => (await import('./tours/team/calendar.tour')).calendarTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/survey': {
		docs: 'user-manual/team/communication#surveys',
		tour: async () => (await import('./tours/team/survey.tour')).surveyTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/survey/[surveyId]': {
		docs: 'user-manual/team/communication#surveys',
		tour: async () => (await import('./tours/team/surveyDetail.tour')).surveyDetailTour
	},

	// Team: statistics and maintenance
	'/(authenticated)/dashboard/[conferenceId]/team/stats': {
		docs: 'user-manual/team/maintenance#statistics',
		tour: async () => (await import('./tours/team/stats.tour')).statsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/plausibility': {
		docs: 'user-manual/team/maintenance#plausibility',
		tour: async () => (await import('./tours/team/plausibility.tour')).plausibilityTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/cleanup': {
		docs: 'user-manual/team/maintenance#cleanup',
		tour: async () => (await import('./tours/team/cleanup.tour')).cleanupTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/helper': {
		docs: 'user-manual/team/maintenance#helper'
	},
	'/(authenticated)/dashboard/[conferenceId]/team/import': {
		docs: 'user-manual/team/maintenance#import',
		tour: async () => (await import('./tours/team/import.tour')).importTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/downloads': {
		docs: 'user-manual/team/maintenance#downloads',
		tour: async () => (await import('./tours/team/downloads.tour')).downloadsTour
	},

	// Team: assignment
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/introduction': {
		docs: 'user-manual/team/assignment',
		tour: async () =>
			(await import('./tours/team/assignmentIntroduction.tour')).assignmentIntroductionTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting': {
		docs: 'user-manual/team/assignment#sighting',
		tour: async () => (await import('./tours/team/assignmentSighting.tour')).assignmentSightingTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/weighting': {
		docs: 'user-manual/team/assignment#weighting',
		tour: async () =>
			(await import('./tours/team/assignmentWeighting.tour')).assignmentWeightingTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/delegations': {
		docs: 'user-manual/team/assignment#delegations',
		tour: async () =>
			(await import('./tours/team/assignmentDelegations.tour')).assignmentDelegationsTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/singles': {
		docs: 'user-manual/team/assignment#single-participants',
		tour: async () => (await import('./tours/team/assignmentSingles.tour')).assignmentSinglesTour
	},
	'/(authenticated)/dashboard/[conferenceId]/team/assignment/finish': {
		docs: 'user-manual/team/assignment#finish-and-release',
		tour: async () => (await import('./tours/team/assignmentFinish.tour')).assignmentFinishTour
	},

	// Team: AI assistants
	'/(authenticated)/dashboard/[conferenceId]/team/ai-access': {
		docs: 'user-manual/team/ai-access',
		tour: async () => (await import('./tours/team/aiAccess.tour')).aiAccessTour
	}
};

/** The manual's start page, for routes without help of their own */
export const DEFAULT_HELP_DOCS = 'user-manual/introduction';
