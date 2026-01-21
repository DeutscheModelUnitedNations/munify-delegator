import { m } from '$lib/paraglide/messages';
import generatePaperInboxLinkWithParams from '$lib/services/paperInboxLink';

export type UserType = 'delegation' | 'singleParticipant' | 'supervisor';

export type ConferenceState =
	| 'PRE'
	| 'PARTICIPANT_REGISTRATION'
	| 'PREPARATION'
	| 'ACTIVE'
	| 'POST';

export interface DashboardLinkContext {
	conferenceId: string;
	userType: UserType;
	conferenceState?: ConferenceState;
	isHeadDelegate?: boolean;
	unlockPayments?: boolean;
	unlockPostals?: boolean;
	hasConferenceInfo?: boolean;
	linkToPreparationGuide?: string | null;
	isOpenPaperSubmission?: boolean;
	linkToPaperInbox?: string | null;
	surveyQuestionCount?: number;
	surveyAnswerCount?: number;
	hasNationAssigned?: boolean;
	membersLackCommittees?: boolean;
	postalRegistrationComplete?: boolean;
	user?: { sub: string; email: string };
}

export interface DashboardLink {
	id: string;
	icon: string;
	getTitle: () => string;
	getDescription: () => string;
	getHref: (ctx: DashboardLinkContext) => string;
	external?: boolean;
	showFor: UserType[];
	isVisible: (ctx: DashboardLinkContext) => boolean;
	isDisabled: (ctx: DashboardLinkContext) => boolean;
	getBadge?: (
		ctx: DashboardLinkContext
	) => { value: string | number; type: 'info' | 'warning' | 'success' | 'error' } | undefined;
}

export const dashboardLinks: DashboardLink[] = [
	{
		id: 'committeeAssignment',
		icon: 'arrows-turn-to-dots',
		getTitle: () => m.committeeAssignment(),
		getDescription: () => m.committeeAssignmentLinkDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/committeeAssignment`,
		showFor: ['delegation'],
		isVisible: (ctx) =>
			!!ctx.isHeadDelegate && !!ctx.hasNationAssigned && !!ctx.membersLackCommittees,
		isDisabled: () => false
	},
	{
		id: 'registrationMode',
		icon: 'id-badge',
		getTitle: () => m.registrationMode(),
		getDescription: () => m.registrationModeLinkDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/registration-mode`,
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: (ctx) => ctx.conferenceState === 'ACTIVE',
		isDisabled: () => false
	},
	{
		id: 'payment',
		icon: 'hand-holding-circle-dollar',
		getTitle: () => m.payment(),
		getDescription: () => m.paymentLinkDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/payment`,
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: () => true,
		isDisabled: (ctx) => !ctx.unlockPayments
	},
	{
		id: 'postalRegistration',
		icon: 'envelopes-bulk',
		getTitle: () => m.postalRegistration(),
		getDescription: () => m.postalRegistrationLinkDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/postalRegistration`,
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: (ctx) => !ctx.postalRegistrationComplete,
		isDisabled: (ctx) => !ctx.unlockPostals
	},
	{
		id: 'survey',
		icon: 'square-poll-horizontal',
		getTitle: () => m.survey(),
		getDescription: () => m.surveyDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/survey`,
		showFor: ['delegation', 'singleParticipant'],
		isVisible: (ctx) => (ctx.surveyQuestionCount ?? 0) > 0,
		isDisabled: () => false,
		getBadge: (ctx) => {
			const unanswered = (ctx.surveyQuestionCount ?? 0) - (ctx.surveyAnswerCount ?? 0);
			if (unanswered > 0) {
				return { value: unanswered, type: 'warning' };
			}
			return undefined;
		}
	},
	{
		id: 'preparation',
		icon: 'book-bookmark',
		getTitle: () => m.preparation(),
		getDescription: () => m.preparationDescription(),
		getHref: (ctx) => ctx.linkToPreparationGuide ?? '',
		external: true,
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: (ctx) => !!ctx.linkToPreparationGuide,
		isDisabled: () => false
	},
	{
		id: 'paperHub',
		icon: 'files',
		getTitle: () => m.paperHub(),
		getDescription: () => m.paperHubDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/paperhub`,
		showFor: ['delegation', 'supervisor'],
		isVisible: (ctx) => !!ctx.isOpenPaperSubmission,
		isDisabled: () => false
	},
	{
		id: 'paperHubGlobal',
		icon: 'folder-open',
		getTitle: () => m.paperHubGlobal(),
		getDescription: () => m.paperHubGlobalDescription(),
		getHref: (ctx) => `/dashboard/${ctx.conferenceId}/paperhub?view=global`,
		showFor: ['delegation', 'supervisor', 'singleParticipant'],
		isVisible: (ctx) => !!ctx.isOpenPaperSubmission,
		isDisabled: () => false
	},
	{
		id: 'paperInbox',
		icon: 'file-circle-plus',
		getTitle: () => m.paperInbox(),
		getDescription: () => m.paperInboxDescription(),
		getHref: (ctx) =>
			ctx.user && ctx.linkToPaperInbox
				? generatePaperInboxLinkWithParams(ctx.linkToPaperInbox, ctx.user)
				: '',
		external: true,
		showFor: ['delegation', 'singleParticipant'],
		isVisible: (ctx) => !!ctx.linkToPaperInbox && !!ctx.user,
		isDisabled: () => false
	}
];

export function getLinksForUserType(
	userType: UserType,
	ctx: DashboardLinkContext
): DashboardLink[] {
	return dashboardLinks.filter((link) => link.showFor.includes(userType) && link.isVisible(ctx));
}
