import type { Component } from 'svelte';
import { resolve } from '$app/paths';
import CalendarLinkInfo from '#lib/components/dashboard/CalendarLinkInfo.svelte';
import PaperHubLinkInfo from '#lib/components/dashboard/PaperHubLinkInfo.svelte';
import TeamEntryInfo from '#lib/components/dashboard/TeamEntryInfo.svelte';
import { m } from '#lib/paraglide/messages';
import type { DashboardHref } from '#lib/data/dashboardLinks';
import { publicCalendarPath, publicSeatsPath, teamRoutesFor } from '#lib/data/teamRoutes';
import type { TeamAccess } from '#lib/helpers/teamAccess';

export interface TeamDashboardLinkContext {
	conferenceId: string;
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
	/** Live details shown on the card, given the conference they are for */
	info?: Component<{ conferenceId: string }>;
}

/**
 * The one way into the team area from the dashboard. The team area has no landing page of its
 * own: this opens the first page of it the caller may open (the registry's order), and the side
 * navigation there lists the rest. `undefined` when the caller may open none.
 */
export function getTeamEntryLink(
	access: TeamAccess & { canSeePaperHub?: boolean }
): TeamDashboardLink | undefined {
	const first = teamRoutesFor(access).find((route) => route.path.startsWith('team/'));
	if (!first) return undefined;
	return {
		id: 'team',
		icon: 'users-gear',
		info: TeamEntryInfo,
		getTitle: () => m.team(),
		getDescription: () => m.manageConference(),
		getHref: (ctx) => resolve(`dashboard/${ctx.conferenceId}/${first.path}`)
	};
}

/**
 * The paper hub, next to the team's card because the registry lists it with the team's pages. It
 * stays at its own path, as participants and supervisors use it too, so this is offered only to
 * whoever may open it (`canSeePaperHub`, as the team navigation decides it).
 */
export function getPaperHubLink(canSeePaperHub: boolean): TeamDashboardLink | undefined {
	if (!canSeePaperHub) return undefined;
	return {
		id: 'paperHub',
		icon: 'files',
		info: PaperHubLinkInfo,
		getTitle: () => m.paperHub(),
		getDescription: () => m.reviewPapers(),
		getHref: (ctx) => resolve(`dashboard/${ctx.conferenceId}/paperhub`)
	};
}

/**
 * What the conference's own settings and the app point the team to: the wiki, the services page,
 * the preparation guide, the public seats and the docs. Each shows only when it is set.
 */
export function getTeamResourceLinks(ctx: TeamDashboardLinkContext): TeamDashboardLink[] {
	return [
		externalLink({
			url: ctx.linkToTeamWiki,
			link: {
				id: 'teamWiki',
				icon: 'book-open',
				getTitle: () => m.teamWiki(),
				getDescription: () => m.teamWikiDescription()
			}
		}),
		externalLink({
			url: ctx.linkToServicesPage,
			link: {
				id: 'servicesPage',
				icon: 'toolbox',
				getTitle: () => m.servicesPage(),
				getDescription: () => m.servicesPageDescription()
			}
		}),
		externalLink({
			url: ctx.linkToPreparationGuide,
			link: {
				id: 'preparation',
				icon: 'book-bookmark',
				getTitle: () => m.preparation(),
				getDescription: () => m.teamPreparationDescription()
			}
		}),
		{
			id: 'seats',
			icon: 'person-seat',
			getTitle: () => m.conferenceSeats(),
			getDescription: () => m.seatsLinkDescription(),
			getHref: (linkCtx) => resolve(`dashboard/${linkCtx.conferenceId}/${publicSeatsPath}`)
		},
		externalLink({
			url: ctx.docsUrl,
			link: {
				id: 'appDocs',
				icon: 'circle-question',
				getTitle: () => m.appDocs(),
				getDescription: () => m.appDocsDescription()
			}
		}),
		{
			id: 'calendar',
			info: CalendarLinkInfo,
			icon: 'calendar-days',
			getTitle: () => m.calendarSectionTitle(),
			getDescription: () => m.calendarSectionDescription(),
			getHref: (linkCtx) => resolve(`dashboard/${linkCtx.conferenceId}/${publicCalendarPath}`)
		}
	].filter((link) => link !== undefined);
}

/** A link out of the app, which exists only while its url is set. */
function externalLink({
	url,
	link
}: {
	url: string | null | undefined;
	link: Pick<TeamDashboardLink, 'id' | 'icon' | 'getTitle' | 'getDescription'>;
}): TeamDashboardLink | undefined {
	if (!url) return undefined;
	return { ...link, getHref: () => ({ externalUrl: url }), external: true };
}
