import { resolve } from '$app/paths';
import { m } from '$lib/paraglide/messages';
import type { TeamroleEnum } from '$lib/api/rumbleClient/client';
import type { DashboardHref } from './dashboardLinks';

export interface TeamDashboardLinkContext {
	conferenceId: string;
	/** Absent for a system admin who is not part of the conference's team. */
	role?: TeamroleEnum;
	isAdmin?: boolean;
	linkToTeamWiki?: string | null;
	linkToServicesPage?: string | null;
	linkToPreparationGuide?: string | null;
	docsUrl?: string | null;
}

export interface TeamDashboardLink {
	id: string;
	icon: string;
	getTitle: () => string;
	getDescription: () => string;
	getHref: (ctx: TeamDashboardLinkContext) => DashboardHref;
	external?: boolean;
	isVisible: (ctx: TeamDashboardLinkContext) => boolean;
	allowedRoles?: TeamroleEnum[];
}

const teamDashboardLinks: TeamDashboardLink[] = [
	{
		id: 'administration',
		icon: 'bars-progress',
		getTitle: () => m.administration(),
		getDescription: () => m.manageConference(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/management', {
				conferenceId: ctx.conferenceId
			}),
		external: false,
		isVisible: () => true,
		allowedRoles: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
	},
	{
		id: 'seatPlanning',
		icon: 'table-cells',
		getTitle: () => m.seatPlanning(),
		getDescription: () => m.seatPlanningDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/management/seat-planning', {
				conferenceId: ctx.conferenceId
			}),
		external: false,
		isVisible: () => true,
		allowedRoles: ['PROJECT_MANAGEMENT', 'CONTENT_LEAD']
	},
	{
		id: 'attendanceScanner',
		icon: 'barcode-read',
		getTitle: () => m.attendanceScanner(),
		getDescription: () => m.attendanceScannerDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/attendance', {
				conferenceId: ctx.conferenceId
			}),
		external: false,
		isVisible: () => true
	},
	{
		id: 'teamCoordination',
		icon: 'user-group',
		getTitle: () => m.teamCoordination(),
		getDescription: () => m.teamCoordinationDescription(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/team-management', {
				conferenceId: ctx.conferenceId
			}),
		external: false,
		isVisible: () => true,
		allowedRoles: ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR']
	},
	{
		id: 'paperHub',
		icon: 'files',
		getTitle: () => m.paperHub(),
		getDescription: () => m.reviewPapers(),
		getHref: (ctx) =>
			resolve('/(authenticated)/dashboard/[conferenceId]/paperhub', {
				conferenceId: ctx.conferenceId
			}),
		external: false,
		isVisible: () => true,
		allowedRoles: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE']
	},
	{
		id: 'teamWiki',
		icon: 'book-open',
		getTitle: () => m.teamWiki(),
		getDescription: () => m.teamWikiDescription(),
		getHref: (ctx) => ({ externalUrl: ctx.linkToTeamWiki ?? '' }),
		external: true,
		isVisible: (ctx) => !!ctx.linkToTeamWiki
	},
	{
		id: 'servicesPage',
		icon: 'toolbox',
		getTitle: () => m.servicesPage(),
		getDescription: () => m.servicesPageDescription(),
		getHref: (ctx) => ({ externalUrl: ctx.linkToServicesPage ?? '' }),
		external: true,
		isVisible: (ctx) => !!ctx.linkToServicesPage
	},
	{
		id: 'preparation',
		icon: 'book-bookmark',
		getTitle: () => m.preparation(),
		getDescription: () => m.teamPreparationDescription(),
		getHref: (ctx) => ({ externalUrl: ctx.linkToPreparationGuide ?? '' }),
		external: true,
		isVisible: (ctx) => !!ctx.linkToPreparationGuide
	},
	{
		id: 'seats',
		icon: 'person-seat',
		getTitle: () => m.conferenceSeats(),
		getDescription: () => m.seatsLinkDescription(),
		getHref: (ctx) => resolve('/seats/[conferenceId]', { conferenceId: ctx.conferenceId }),
		external: true,
		isVisible: () => true
	},
	{
		id: 'appDocs',
		icon: 'circle-question',
		getTitle: () => m.appDocs(),
		getDescription: () => m.appDocsDescription(),
		getHref: (ctx) => ({ externalUrl: ctx.docsUrl ?? '' }),
		external: true,
		isVisible: (ctx) => !!ctx.docsUrl
	}
];

export function getTeamLinksForRole(ctx: TeamDashboardLinkContext): TeamDashboardLink[] {
	return teamDashboardLinks.filter((link) => {
		if (!link.isVisible(ctx)) return false;
		if (link.allowedRoles && !ctx.isAdmin) {
			const { role } = ctx;
			if (!role || !link.allowedRoles.includes(role)) return false;
		}
		return true;
	});
}
