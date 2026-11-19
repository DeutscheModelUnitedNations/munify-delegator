import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** The plausibility checks and the possible duplicate accounts. */
export const plausibilityTour: Tour = {
	id: 'team.plausibility',
	steps: [
		{
			title: () => m.tourTeamPlausibilityIntroTitle(),
			body: () => m.tourTeamPlausibilityIntroBody()
		},
		{
			anchor: 'team.plausibility.age-limits',
			title: () => m.tourTeamPlausibilityAgeLimitsTitle(),
			body: () => m.tourTeamPlausibilityAgeLimitsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.plausibility.checks',
			title: () => m.tourTeamPlausibilityChecksTitle(),
			body: () => m.tourTeamPlausibilityChecksBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.plausibility.duplicates',
			title: () => m.tourTeamPlausibilityDuplicatesTitle(),
			body: () => m.tourTeamPlausibilityDuplicatesBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.plausibility.pair',
			title: () => m.tourTeamPlausibilityPairTitle(),
			body: () => m.tourTeamPlausibilityPairBody(),
			side: 'top'
		}
	]
};
