import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';
import type { Component } from 'svelte';
import { m } from '#lib/paraglide/messages.js';
import CalendarLinkInfo from '#lib/components/dashboard/CalendarLinkInfo.svelte';
import generatePaperInboxLinkWithParams from '#lib/helpers/paperInboxLink.js';

export type UserType = 'delegation' | 'singleParticipant' | 'supervisor';

export type ConferenceState =
	'PRE' | 'PARTICIPANT_REGISTRATION' | 'PREPARATION' | 'ACTIVE' | 'POST';

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
	showCalendar?: boolean;
	linkToPaperInbox?: string | null;
	hasNationAssigned?: boolean;
	membersLackCommittees?: boolean;
	paymentStatus?: 'DONE' | 'PENDING' | 'PROBLEM';
	postalRegistrationStatus?: 'DONE' | 'PENDING' | 'PROBLEM';
	user?: { sub: string; email: string };
}

/** Where a dashboard link points: a route of this app, or a URL outside it. */
export type DashboardHref = ResolvedPathname | { externalUrl: string };

export interface DashboardLink {
	id: string;
	icon: string;
	getTitle: () => string;
	getDescription: () => string;
	getHref: (ctx: DashboardLinkContext) => DashboardHref;
	external?: boolean;
	/** Live details shown on the card, given the conference they are for */
	info?: Component<{ conferenceId: string }>;
	showFor: UserType[];
	isVisible: (ctx: DashboardLinkContext) => boolean;
	isDisabled: (ctx: DashboardLinkContext) => boolean;
	getBadge?: (
		ctx: DashboardLinkContext
	) => { value: string | number; type: 'info' | 'warning' | 'success' | 'error' } | undefined;
	isImportant?: (ctx: DashboardLinkContext) => boolean;
}

const dashboardLinks: DashboardLink[] = [
	{
		id: 'committeeAssignment',
		icon: 'arrows-turn-to-dots',
		getTitle: () => m.committeeAssignment(),
		getDescription: () => m.committeeAssignmentLinkDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/committee-assignment', {
				conferenceId: ctx.conferenceId
			}),
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
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/registration-mode', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		// Already in preparation, so everybody can try it on their phone before they arrive.
		isVisible: (ctx) => ctx.conferenceState === 'PREPARATION' || ctx.conferenceState === 'ACTIVE',
		isDisabled: () => false
	},
	{
		id: 'payment',
		icon: 'hand-holding-circle-dollar',
		getTitle: () => m.payment(),
		getDescription: () => m.paymentLinkDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/payment', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: (ctx) => ctx.paymentStatus !== 'DONE',
		isDisabled: (ctx) => !ctx.unlockPayments,
		getBadge: (ctx) => (!ctx.unlockPayments ? undefined : { value: '!', type: 'warning' }),
		isImportant: () => true
	},
	{
		id: 'postalRegistration',
		icon: 'envelopes-bulk',
		getTitle: () => m.postalRegistration(),
		getDescription: () => m.postalRegistrationLinkDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/postal-registration', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		isVisible: (ctx) => ctx.postalRegistrationStatus !== 'DONE',
		isDisabled: (ctx) => !ctx.unlockPostals,
		getBadge: (ctx) => (!ctx.unlockPostals ? undefined : { value: '!', type: 'warning' }),
		isImportant: () => true
	},
	{
		id: 'preparation',
		icon: 'book-bookmark',
		getTitle: () => m.preparation(),
		getDescription: () => m.preparationDescription(),
		getHref: (ctx) => ({ externalUrl: ctx.linkToPreparationGuide ?? '' }),
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
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/paperhub', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'supervisor'],
		isVisible: (ctx) => !!ctx.isOpenPaperSubmission,
		isDisabled: () => false
	},
	{
		id: 'paperHubGlobal',
		icon: 'folder-open',
		getTitle: () => m.paperHubGlobal(),
		getDescription: () => m.paperHubGlobalDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/paperhub?view=global', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'supervisor', 'singleParticipant'],
		isVisible: (ctx) => !!ctx.isOpenPaperSubmission,
		isDisabled: () => false
	},
	{
		id: 'paperInbox',
		icon: 'file-circle-plus',
		getTitle: () => m.paperInbox(),
		getDescription: () => m.paperInboxDescription(),
		getHref: (ctx) => ({
			externalUrl:
				ctx.user && ctx.linkToPaperInbox
					? generatePaperInboxLinkWithParams(ctx.linkToPaperInbox, ctx.user)
					: ''
		}),
		external: true,
		showFor: ['delegation', 'singleParticipant'],
		isVisible: (ctx) => !!ctx.linkToPaperInbox && !!ctx.user,
		isDisabled: () => false
	},
	{
		id: 'seats',
		icon: 'person-seat',
		getTitle: () => m.conferenceSeats(),
		getDescription: () => m.seatsLinkDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/seats', {
				conferenceId: ctx.conferenceId
			}),
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		// The seats are known - and of interest to everyone deciding where to apply - from the
		// moment registration opens
		isVisible: (ctx) => !!ctx.conferenceState && ctx.conferenceState !== 'PRE',
		isDisabled: () => false
	},
	{
		id: 'calendar',
		icon: 'calendar-days',
		getTitle: () => m.calendarSectionTitle(),
		getDescription: () => m.calendarSectionDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/calendar', {
				conferenceId: ctx.conferenceId
			}),
		info: CalendarLinkInfo,
		showFor: ['delegation', 'singleParticipant', 'supervisor'],
		// Shown once the team has switched the schedule on
		isVisible: (ctx) => !!ctx.showCalendar,
		isDisabled: () => false
	}
];

export function getLinksForUserType(
	userType: UserType,
	ctx: DashboardLinkContext
): DashboardLink[] {
	return dashboardLinks.filter((link) => link.showFor.includes(userType) && link.isVisible(ctx));
}
