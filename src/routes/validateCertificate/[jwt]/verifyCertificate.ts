import { importJWK, jwtVerify } from 'jose';
import { client } from '#lib/api/rumbleClient/client';
import {
	certificateAlg,
	certificateRequiredClaims
} from '#api/handlers/certificateConfig/certificateConfig';
import type { CertificateJWTPayload } from '#api/handlers/certificate/certificate';
import { sessionsFromClaim } from '#lib/utils/certificateSessionLayout';
import { logger } from '#lib/logger';

/** What the page shows for a certificate that did not verify. */
const INVALID = {
	fullName: undefined,
	conferenceTitle: undefined,
	conferenceStartDate: undefined,
	conferenceEndDate: undefined,
	sessions: []
};

/** The public key the API publishes, as `importJWK` takes it. */
export function certificatePublicKey(
	jwk: { kty?: string | null; alg?: string | null; e?: string | null; n?: string | null } | null
) {
	if (!jwk?.kty) {
		throw new Error('Missing JWK public key');
	}
	return {
		kty: jwk.kty,
		alg: jwk.alg ?? certificateAlg,
		e: jwk.e ?? undefined,
		n: jwk.n ?? undefined
	};
}

/** What a verified certificate states. */
export function certificateFacts(payload: CertificateJWTPayload) {
	return {
		fullName: payload.n,
		conferenceTitle: payload.t,
		conferenceStartDate: payload.s ? new Date(payload.s) : undefined,
		conferenceEndDate: payload.e ? new Date(payload.e) : undefined,
		sessions: sessionsFromClaim(payload.a)
	};
}

/**
 * Checks a participation certificate against the public key the API publishes.
 *
 * An empty result means the certificate did not verify, which the page renders as invalid.
 */
export async function verifyCertificate(jwt: string) {
	const jwk = await client.query.getCertificateJWTPublicKeyObject({
		alg: true,
		e: true,
		n: true,
		kty: true
	});
	const imported = await importJWK(certificatePublicKey(jwk));

	try {
		const verified = await jwtVerify<CertificateJWTPayload>(jwt, imported, {
			requiredClaims: certificateRequiredClaims,
			algorithms: [certificateAlg]
		});
		return certificateFacts(verified.payload);
	} catch (error) {
		logger.warn('Certificate JWT verification failed', error);
		return INVALID;
	}
}
