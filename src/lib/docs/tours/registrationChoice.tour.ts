import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';
import { REGISTRATION_CHOICE_ANCHOR } from './anchors';

/**
 * The registration on a conference's dashboard, for someone without a part in it yet. Anchors
 * live in `RegistrationLanding.svelte` and `apply/ApplyFlow.svelte`.
 */
export const registrationChoiceTour: Tour = {
	id: 'registration.choice',
	steps: [
		{
			title: () => m.tourRegistrationIntroTitle(),
			body: () => m.tourRegistrationIntroBody()
		},
		{
			anchor: REGISTRATION_CHOICE_ANCHOR,
			title: () => m.tourRegistrationChoiceTitle(),
			body: () => m.tourRegistrationChoiceBody(),
			side: 'top'
		},
		{
			anchor: 'registration.assistant',
			title: () => m.tourRegistrationAssistantTitle(),
			body: () => m.tourRegistrationAssistantBody(),
			side: 'bottom'
		},
		{
			anchor: 'registration.seats',
			title: () => m.tourRegistrationSeatsTitle(),
			body: () => m.tourRegistrationSeatsBody(),
			side: 'left'
		}
	]
};
