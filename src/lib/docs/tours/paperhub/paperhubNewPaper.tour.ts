import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * Writing a new position or introduction paper.
 */
export const paperhubNewPaperTour: Tour = {
	id: 'paperhub.paperhubNewPaper',
	steps: [
		{
			title: () => m.tourPaperhubNewPaperIntroTitle(),
			body: () => m.tourPaperhubNewPaperIntroBody()
		},
		{
			anchor: 'paperhub.new-paper.details',
			title: () => m.tourPaperhubNewPaperDetailsTitle(),
			body: () => m.tourPaperhubNewPaperDetailsBody(),
			side: 'left'
		},
		{
			anchor: 'paperhub.new-paper.editor',
			title: () => m.tourPaperhubNewPaperEditorTitle(),
			body: () => m.tourPaperhubNewPaperEditorBody(),
			side: 'top'
		},
		{
			anchor: 'paperhub.new-paper.save',
			title: () => m.tourPaperhubNewPaperSaveTitle(),
			body: () => m.tourPaperhubNewPaperSaveBody(),
			side: 'left'
		},
		{
			title: () => m.tourPaperhubNewPaperBackupTitle(),
			body: () => m.tourPaperhubNewPaperBackupBody()
		}
	]
};
