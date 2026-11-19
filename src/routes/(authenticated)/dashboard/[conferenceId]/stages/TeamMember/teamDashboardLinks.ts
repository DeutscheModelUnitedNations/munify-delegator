import type { Component } from 'svelte';
import { m } from '#lib/paraglide/messages';
import type { DashboardHref } from '#lib/data/dashboardLinks';

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
 * What the conference's own settings and the app point the team to: the wiki, the services page,
 * the preparation guide and the docs. Each shows only when it is set. The participants' views of
 * the seats and the schedule are linked from the team's own pages of them.
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
		externalLink({
			url: ctx.docsUrl,
			link: {
				id: 'appDocs',
				icon: 'question',
				getTitle: () => m.appDocs(),
				getDescription: () => m.appDocsDescription()
			}
		})
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
