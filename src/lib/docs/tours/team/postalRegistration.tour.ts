import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/** Ticking off the letters of the postal registration. The scanner anchors live in `BarcodeScanner` (`scanner.*`). */
export const postalRegistrationTour: Tour = {
	id: 'team.postalRegistration',
	steps: [
		{
			title: () => m.tourTeamPostalRegistrationIntroTitle(),
			body: () => m.tourTeamPostalRegistrationIntroBody()
		},
		{
			anchor: 'scanner.search',
			title: () => m.tourTeamPostalRegistrationSearchTitle(),
			body: () => m.tourTeamPostalRegistrationSearchBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.postalRegistration.paper',
			title: () => m.tourTeamPostalRegistrationPaperTitle(),
			body: () => m.tourTeamPostalRegistrationPaperBody(),
			side: 'bottom'
		},
		{
			anchor: 'scanner.camera',
			title: () => m.tourTeamPostalRegistrationCameraTitle(),
			body: () => m.tourTeamPostalRegistrationCameraBody(),
			side: 'right'
		},
		{
			title: () => m.tourTeamPostalRegistrationCardTitle(),
			body: () => m.tourTeamPostalRegistrationCardBody()
		}
	]
};
