import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The participants table. Anchors live in the DataGrid (`grid.*`). */
export const participantsTour: Tour = {
	id: 'team.participants',
	steps: [
		{
			title: () => m.tourTeamParticipantsIntroTitle(),
			body: () => m.tourTeamParticipantsIntroBody()
		},
		{
			anchor: 'grid.toolbar',
			title: () => m.tourTeamParticipantsToolbarTitle(),
			body: () => m.tourTeamParticipantsToolbarBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.views',
			title: () => m.tourTeamParticipantsViewsTitle(),
			body: () => m.tourTeamParticipantsViewsBody(),
			side: 'bottom'
		},
		{
			anchor: 'grid.table',
			title: () => m.tourTeamParticipantsTableTitle(),
			body: () => m.tourTeamParticipantsTableBody(),
			side: 'top'
		}
	]
};
