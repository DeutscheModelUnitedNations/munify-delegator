import formatNames from '#lib/helpers/formatNames';
import type { CertificateJWTPayload } from '#lib/helpers/certificateJwt';

/**
 * The names of the check-in sessions the person was scanned at, in the order they started. A
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
): string[] {
	return sessions
		.map((session) => ({ ...session, name: session.occasion.trim() }))
		.filter((session) => session.name && session.attended && session.showOnCertificate)
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
		.map(({ name }) => name);
}

interface CertifiedConference {
	title: string;
	longTitle: string | null;
	startConference: Date | null;
	endConference: Date | null;
}

const timeOf = (date: Date | null) => date?.getTime() ?? 0;

function certificatePayload({
	fullName,
	conference,
	sessions
}: {
	fullName: string;
	conference: CertifiedConference;
	sessions?: string[];
}): CertificateJWTPayload {
	return {
		n: fullName,
		t: conference.longTitle || conference.title,
		s: timeOf(conference.startConference),
		e: timeOf(conference.endConference),
		...(sessions?.length ? { a: sessions } : {})
	};
}

/**
 * What a participation certificate states: who attended which conference, and when it took place.
 * Undefined until attendance is recorded.
 */
export function certificateContents(status: {
	didAttend: boolean;
	conference: CertifiedConference | null | undefined;
	user: { givenName: string; familyName: string } | null | undefined;
	/** The names of the sessions the person was at (`certificateSessions`). */
	sessions?: string[];
}): { fullName: string; payload: CertificateJWTPayload } | undefined {
	const { conference, sessions } = status;
	if (!status.didAttend || !conference) return undefined;

	const { givenName, familyName } = status.user ?? {};
	const fullName = formatNames({
		givenName,
		familyName,
		options: {
			familyNameUppercase: false,
			givenNameUppercase: false
		}
	});

	return { fullName, payload: certificatePayload({ fullName, conference, sessions }) };
}
