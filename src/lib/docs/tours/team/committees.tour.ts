import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The committees and their agenda items (`CommitteesManager`). */
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
			anchor: 'team.committees.add',
			title: () => m.tourTeamCommitteesAddTitle(),
			body: () => m.tourTeamCommitteesAddBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.committees.card',
			title: () => m.tourTeamCommitteesCardTitle(),
			body: () => m.tourTeamCommitteesCardBody(),
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
