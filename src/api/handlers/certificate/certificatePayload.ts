import formatNames from '#lib/helpers/formatNames';

export interface CertificateJWTPayload extends Record<string, unknown> {
	/** Deliberately terse: these end up in a QR code, so every byte counts. */
	n: string;
	t: string;
	s: number;
	e: number;
	/**
	 * The check-in sessions the person was checked in at, by name, each with 1. Certificates issued
	 * earlier also list the sessions the person missed, with 0, which nothing shows any more; those
	 * issued before sessions were listed have no claim at all.
	 */
	a?: [string, 0 | 1][];
}

/** One check-in occasion of a conference; a certificate lists only those its holder was at. */
export type CertificateSession = { name: string; attended: boolean };

/**
 * The occasions of a conference's check-in sessions the person was scanned at, in the order they
 * first took place, merged by name (several scanners running at once each have a session; one
 * scan in any of them counts). A certificate states only where someone was, never where they were
 * not, so the occasions they missed are left out, and so are those the team took off the
 * certificates (`showOnCertificate`; one session taken off takes the occasion off).
 */
export function certificateSessions(
	sessions: {
		occasion: string;
		startedAt: Date;
		attended: boolean;
		showOnCertificate: boolean;
	}[]
): CertificateSession[] {
	const byName = new Map<string, CertificateSession & { startedAt: number; shown: boolean }>();
	for (const session of sessions) {
		const name = session.occasion.trim();
		if (!name) continue;
		const key = name.toLocaleLowerCase();
		const known = byName.get(key) ?? {
			name,
			attended: false,
			startedAt: session.startedAt.getTime(),
			shown: true
		};
		known.shown &&= session.showOnCertificate;
		known.attended ||= session.attended;
		known.startedAt = Math.min(known.startedAt, session.startedAt.getTime());
		byName.set(key, known);
	}
	return [...byName.values()]
		.filter((session) => session.shown && session.attended)
		.sort((a, b) => a.startedAt - b.startedAt)
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
