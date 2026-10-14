import formatNames from '$lib/helpers/formatNames';

export interface CertificateJWTPayload extends Record<string, unknown> {
	/** Deliberately terse: these end up in a QR code, so every byte counts. */
	n: string;
	t: string;
	s: number;
	e: number;
}

/**
 * What a participation certificate states: who attended which conference, and when it took place.
 * Undefined until attendance is recorded.
 */
export function certificateContents(status: {
	didAttend: boolean;
	conference:
		| {
				title: string;
				longTitle: string | null;
				startConference: Date | null;
				endConference: Date | null;
		  }
		| null
		| undefined;
	user: { givenName: string; familyName: string } | null | undefined;
}): { fullName: string; payload: CertificateJWTPayload } | undefined {
	const { conference, user } = status;
	if (!status.didAttend || !conference) return undefined;

	const fullName = formatNames(user?.givenName, user?.familyName, {
		familyNameUppercase: false,
		givenNameUppercase: false
	});

	return {
		fullName,
		payload: {
			n: fullName,
			t: conference.longTitle || conference.title,
			s: conference.startConference?.getTime() ?? 0,
			e: conference.endConference?.getTime() ?? 0
		}
	};
}
