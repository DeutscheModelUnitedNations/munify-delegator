import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * Writing a new working paper in the resolution editor.
 */
export const paperhubNewResolutionTour: Tour = {
	id: 'paperhub.paperhubNewResolution',
	steps: [
		{
			title: () => m.tourPaperhubNewResolutionIntroTitle(),
			body: () => m.tourPaperhubNewResolutionIntroBody()
		},
		{
			anchor: 'paperhub.new-paper.details',
			title: () => m.tourPaperhubNewResolutionDetailsTitle(),
			body: () => m.tourPaperhubNewResolutionDetailsBody(),
			side: 'left'
		},
		{
			anchor: 'paperhub.new-paper.editor',
			title: () => m.tourPaperhubNewResolutionEditorTitle(),
			body: () => m.tourPaperhubNewResolutionEditorBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.new-paper.editor',
			title: () => m.tourPaperhubNewResolutionClausesTitle(),
			body: () => m.tourPaperhubNewResolutionClausesBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.new-paper.save',
			title: () => m.tourPaperhubNewResolutionSaveTitle(),
			body: () => m.tourPaperhubNewResolutionSaveBody(),
			side: 'left'
		}
	]
};
