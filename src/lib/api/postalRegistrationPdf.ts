import { m } from '#lib/paraglide/messages';
import { toast } from 'svelte-sonner';
import { postalParticipant, postalRecipient } from './postalRegistrationData';
import {
	downloadPostalRegistrationDocuments,
	fetchPostalRegistrationSources
} from './postalRegistrationSources';
import { logger } from '#lib/logger';
import { passPostalGuide } from '#lib/state/postalGuide.svelte.js';

/**
 * Builds and downloads one person's postal registration documents for one conference.
 *
 * The guide to sending them comes first (`passPostalGuide`); without it nothing is downloaded.
 *
 * Everything the PDF needs is read here, once, at the moment of download (see
 * `fetchPostalRegistrationSources`).
 *
 * Reports problems, including an incomplete address, as toasts rather than throwing.
 */
export async function downloadPostalRegistration({
	userId,
	conferenceId,
	onStart
}: {
	userId: string;
	conferenceId: string;
	/** Called when the work begins, once the guide is closed. */
	onStart?: () => void;
}): Promise<void> {
	try {
		if (!(await passPostalGuide())) return;
		onStart?.();

		const { user, conference, issueCodes } = await fetchPostalRegistrationSources({
			userId,
			conferenceId
		});

		const participant = postalParticipant(user);
		if (!participant) {
			toast.error(m.incompleteAddressOrBirthdayForPostalRegistration());
			return;
		}

		await downloadPostalRegistrationDocuments({
			conference,
			issueCodes,
			recipient: postalRecipient(conference),
			...participant
		});

		toast.success(m.postalRegistrationPDFGenerated());
	} catch (error) {
		logger.error('Error generating PDF', error);
		toast.error(m.errorGeneratingPostalRegistrationPDF());
	}
}
