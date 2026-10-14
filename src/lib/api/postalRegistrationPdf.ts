import { m } from '$lib/paraglide/messages';
import { toast } from 'svelte-sonner';
import { postalParticipant, postalRecipient } from './postalRegistrationData';
import {
	downloadPostalRegistrationDocuments,
	fetchPostalRegistrationSources
} from './postalRegistrationSources';

/**
 * Builds and downloads one person's postal registration documents for one conference.
 *
 * Everything the PDF needs is read here, once, at the moment of download (see
 * `fetchPostalRegistrationSources`).
 *
 * Reports problems, including an incomplete address, as toasts rather than throwing.
 */
export async function downloadPostalRegistration(
	userId: string,
	conferenceId: string
): Promise<void> {
	try {
		const { user, conference } = await fetchPostalRegistrationSources(userId, conferenceId);

		const participant = postalParticipant(user);
		if (!participant) {
			toast.error(m.incompleteAddressOrBirthdayForPostalRegistration());
			return;
		}

		await downloadPostalRegistrationDocuments({
			conference,
			recipient: postalRecipient(conference),
			...participant
		});

		toast.success(m.postalRegistrationPDFGenerated());
	} catch (error) {
		console.error('Error generating PDF:', error);
		toast.error(m.errorGeneratingPostalRegistrationPDF());
	}
}
