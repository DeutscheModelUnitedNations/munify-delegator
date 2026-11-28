import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The committees and their agenda items (`CommitteesManager`): list, picked committee, its topics. */
export const committeesTour: Tour = {
	id: 'team.committees',
	steps: [
		{
			title: () => m.tourTeamCommitteesIntroTitle(),
			body: () => m.tourTeamCommitteesIntroBody()
		},
		{
			anchor: 'team.committees.seat-planning-hint',
			title: () => m.tourTeamCommitteesSeatPlanningTitle(),
			body: () => m.tourTeamCommitteesSeatPlanningBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.committees.list',
			title: () => m.tourTeamCommitteesListTitle(),
			body: () => m.tourTeamCommitteesListBody(),
			side: 'right'
		},
		{
			anchor: 'team.committees.add',
			title: () => m.tourTeamCommitteesAddTitle(),
			body: () => m.tourTeamCommitteesAddBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.committees.settings',
			title: () => m.tourTeamCommitteesSettingsTitle(),
			body: () => m.tourTeamCommitteesSettingsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.committees.agenda-items',
			title: () => m.tourTeamCommitteesAgendaItemsTitle(),
			body: () => m.tourTeamCommitteesAgendaItemsBody(),
			side: 'top'
		}
	]
};
