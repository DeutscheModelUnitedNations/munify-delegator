import { client } from '#lib/api/rumbleClient/client';

/** The bank details every payment page needs to render a transfer reference. */
export function fetchConferencePaymentData(conferenceId: string) {
	return client.liveQuery.conference({
		__args: { id: conferenceId },
		id: true,
		title: true,
		longTitle: true,
		bankAccountHolder: true,
		feeAmount: true,
		iban: true,
		bic: true,
		bankName: true,
		currency: true
	});
}

export type ConferencePaymentData = Awaited<ReturnType<typeof fetchConferencePaymentData>>;
