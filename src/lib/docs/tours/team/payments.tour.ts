import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Confirming bank transfers by their reference. */
export const paymentsTour: Tour = {
	id: 'team.payments',
	steps: [
		{
			title: () => m.tourTeamPaymentsIntroTitle(),
			body: () => m.tourTeamPaymentsIntroBody()
		},
		{
			anchor: 'team.payments.latest',
			title: () => m.tourTeamPaymentsLatestTitle(),
			body: () => m.tourTeamPaymentsLatestBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.payments.search',
			title: () => m.tourTeamPaymentsSearchTitle(),
			body: () => m.tourTeamPaymentsSearchBody(),
			side: 'bottom'
		},
		{
			title: () => m.tourTeamPaymentsResultTitle(),
			body: () => m.tourTeamPaymentsResultBody()
		}
	]
};
