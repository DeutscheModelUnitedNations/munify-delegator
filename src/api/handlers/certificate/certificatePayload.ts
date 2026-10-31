import formatNames from '#lib/helpers/formatNames';
import type { CertificateJWTPayload } from '#lib/helpers/certificateJwt';

/** One check-in occasion of a conference; a certificate lists only those its holder was at. */
export type CertificateSession = { name: string; attended: boolean };

/**
 * The conference's check-in sessions the person was scanned at, in the order they started. A
 * certificate states only where someone was, never where they were not, so the sessions they
 * missed are left out, and so are those the team took off the certificates (`showOnCertificate`).
 */
export function certificateSessions(
	sessions: {
		occasion: string;
		startedAt: Date;
		attended: boolean;
		showOnCertificate: boolean;
	}[]
): CertificateSession[] {
	return sessions
		.map((session) => ({ ...session, name: session.occasion.trim() }))
		.filter((session) => session.name && session.attended && session.showOnCertificate)
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
		.map(({ name, attended }) => ({ name, attended }));
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
	sessions?: CertificateSession[];
}): { fullName: string; payload: CertificateJWTPayload } | undefined {
	const { conference, user } = status;
	if (!status.didAttend || !conference) return undefined;

	const fullName = formatNames({
		givenName: user?.givenName,
		familyName: user?.familyName,
		options: {
			familyNameUppercase: false,
			givenNameUppercase: false
		}
	});

	return {
		fullName,
		payload: {
			n: fullName,
			t: conference.longTitle || conference.title,
			s: conference.startConference?.getTime() ?? 0,
			e: conference.endConference?.getTime() ?? 0,
			...(status.sessions?.length
				? {
						a: status.sessions.map((session): [string, 0 | 1] => [
							session.name,
							session.attended ? 1 : 0
						])
					}
				: {})
		}
	};
}
