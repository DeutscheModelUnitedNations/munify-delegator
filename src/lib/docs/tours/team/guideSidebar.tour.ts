import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The guide's sidebar builder. Anchors live in `team/guide-sidebar/+page.svelte`. */
export const guideSidebarTour: Tour = {
	id: 'team.guideSidebar',
	steps: [
		{
			title: () => m.tourTeamGuideSidebarIntroTitle(),
			body: () => m.tourTeamGuideSidebarIntroBody()
		},
		{
			anchor: 'team.guideSidebar.sections',
			title: () => m.tourTeamGuideSidebarSectionsTitle(),
			body: () => m.tourTeamGuideSidebarSectionsBody(),
			side: 'right'
		},
		{
			anchor: 'team.guideSidebar.template',
			title: () => m.tourTeamGuideSidebarTemplateTitle(),
			body: () => m.tourTeamGuideSidebarTemplateBody(),
			side: 'right'
		},
		{
			anchor: 'team.guideSidebar.preview',
			title: () => m.tourTeamGuideSidebarPreviewTitle(),
			body: () => m.tourTeamGuideSidebarPreviewBody(),
			side: 'left'
		},
		{
			anchor: 'team.guideSidebar.publish',
			title: () => m.tourTeamGuideSidebarPublishTitle(),
			body: () => m.tourTeamGuideSidebarPublishBody(),
			side: 'bottom'
		}
	]
};
