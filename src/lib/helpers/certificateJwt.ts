/**
 * The shape of a participation certificate, shared by the API that signs it
 * (`#api/handlers/certificate/`) and the page that verifies it (`/validateCertificate`).
 */

/** The algorithm certificates are signed with. */
export const certificateAlg = 'RS256';

/** The claims every certificate carries; one without them does not verify. */
export const certificateRequiredClaims = ['n', 't', 's', 'e'];

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
