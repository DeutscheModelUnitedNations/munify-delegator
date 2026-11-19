import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** A school's page: its metrics, its details and its people in this conference. */
export const schoolTour: Tour = {
	id: 'team.school',
	steps: [
		{
			title: () => m.tourTeamSchoolIntroTitle(),
			body: () => m.tourTeamSchoolIntroBody()
		},
		{
			anchor: 'team.school.metrics',
			title: () => m.tourTeamSchoolMetricsTitle(),
			body: () => m.tourTeamSchoolMetricsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.school.form',
			title: () => m.tourTeamSchoolFormTitle(),
			body: () => m.tourTeamSchoolFormBody(),
			side: 'top'
		},
		{
			anchor: 'team.school.people',
			title: () => m.tourTeamSchoolPeopleTitle(),
			body: () => m.tourTeamSchoolPeopleBody(),
			side: 'top'
		},
		{
			anchor: 'team.school.delete',
			title: () => m.tourTeamSchoolDeleteTitle(),
			body: () => m.tourTeamSchoolDeleteBody(),
			side: 'left'
		}
	]
};
