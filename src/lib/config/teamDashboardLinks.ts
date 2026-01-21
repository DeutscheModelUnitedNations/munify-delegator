import { m } from '$lib/paraglide/messages';
import type { TeamRole } from '@prisma/client';

export interface TeamDashboardLinkContext {
  conferenceId: string;
  role: TeamRole;
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
  getHref: (ctx: TeamDashboardLinkContext) => string;
  external?: boolean;
  isVisible: (ctx: TeamDashboardLinkContext) => boolean;
  allowedRoles?: TeamRole[];
}

export const teamDashboardLinks: TeamDashboardLink[] = [
  {
    id: 'administration',
    icon: 'bars-progress',
    getTitle: () => m.administration(),
    getDescription: () => m.manageConference(),
    getHref: (ctx) => `/management/${ctx.conferenceId}`,
    external: false,
    isVisible: () => true,
    allowedRoles: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
  },
  {
    id: 'paperHub',
    icon: 'files',
    getTitle: () => m.paperHub(),
    getDescription: () => m.reviewPapers(),
    getHref: (ctx) => `/dashboard/${ctx.conferenceId}/paperhub`,
    external: false,
    isVisible: () => true,
    allowedRoles: ['REVIEWER', 'PROJECT_MANAGEMENT']
  },
  {
    id: 'teamWiki',
    icon: 'book-open',
    getTitle: () => m.teamWiki(),
    getDescription: () => m.teamWikiDescription(),
    getHref: (ctx) => ctx.linkToTeamWiki ?? '',
    external: true,
    isVisible: (ctx) => !!ctx.linkToTeamWiki
  },
  {
    id: 'servicesPage',
    icon: 'toolbox',
    getTitle: () => m.servicesPage(),
    getDescription: () => m.servicesPageDescription(),
    getHref: (ctx) => ctx.linkToServicesPage ?? '',
    external: true,
    isVisible: (ctx) => !!ctx.linkToServicesPage
  },
  {
    id: 'preparation',
    icon: 'book-bookmark',
    getTitle: () => m.preparation(),
    getDescription: () => m.teamPreparationDescription(),
    getHref: (ctx) => ctx.linkToPreparationGuide ?? '',
    external: true,
    isVisible: (ctx) => !!ctx.linkToPreparationGuide
  },
  {
    id: 'appDocs',
    icon: 'circle-question',
    getTitle: () => m.appDocs(),
    getDescription: () => m.appDocsDescription(),
    getHref: (ctx) => ctx.docsUrl ?? '',
    external: true,
    isVisible: (ctx) => !!ctx.docsUrl
  },
];

export function getTeamLinksForRole(ctx: TeamDashboardLinkContext): TeamDashboardLink[] {
  return teamDashboardLinks.filter((link) => {
    if (!link.isVisible(ctx)) return false;
    if (link.allowedRoles && !link.allowedRoles.includes(ctx.role)) return false;
    return true;
  });
}
