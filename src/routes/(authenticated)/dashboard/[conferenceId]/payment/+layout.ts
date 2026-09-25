import { client } from '$lib/api/rumbleClient/client';
import type { LayoutLoad } from './$types';

/** The bank details every payment page needs to render a transfer reference. */
function fetchConferencePaymentData(conferenceId: string) {
	return client.query.conference({
		__args: { id: conferenceId },
		id: true,
		title: true,
		longTitle: true,
		accountHolder: true,
		feeAmount: true,
		iban: true,
		bic: true,
		bankName: true,
		currency: true
	});
}

export type ConferencePaymentData = Awaited<ReturnType<typeof fetchConferencePaymentData>>;

export const load: LayoutLoad = async (event) => ({
	conferencePaymentData: await fetchConferencePaymentData(event.params.conferenceId)
});
