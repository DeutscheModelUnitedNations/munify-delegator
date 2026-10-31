/**
 * The shape of a participation certificate, shared by the API that signs it
 * (`#api/handlers/certificate/`) and the page that verifies it (`/validateCertificate`).
 */

/** The algorithm certificates are signed with. */
export const certificateAlg = 'RS256';

/** The claims every certificate carries; one without them does not verify. */
export const certificateRequiredClaims = ['n', 't', 's', 'e'];

/**
 * The claims a participation certificate signs. The names are deliberately terse: they end up in a
 * QR code, so every byte counts.
 */
export interface CertificateJWTPayload extends Record<string, unknown> {
	/** The holder's full name, as printed on the certificate. */
	n: string;
	/** The conference's long title, or its title when it has none. */
	t: string;
	/** When the conference started, in milliseconds since the epoch; 0 when no date was set. */
	s: number;
	/** When the conference ended, in milliseconds since the epoch; 0 when no date was set. */
	e: number;
	/**
	 * The names of the check-in sessions the person was checked in at, never those they missed.
	 * Left out without any, and on certificates issued before sessions were listed.
	 */
	a?: string[];
}
