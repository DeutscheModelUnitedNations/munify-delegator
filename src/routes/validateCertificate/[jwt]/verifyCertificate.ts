import { importJWK, jwtVerify } from 'jose';
import { client } from '$lib/api/rumbleClient/client';
import { certificateAlg, certificateRequiredClaims } from '$api/handlers/certificateConfig';
import type { CertificateJWTPayload } from '$api/handlers/certificate';

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

	if (!jwk?.kty) {
		throw new Error('Missing JWK public key');
	}

	const imported = await importJWK({
		kty: jwk.kty,
		alg: jwk.alg ?? certificateAlg,
		e: jwk.e ?? undefined,
		n: jwk.n ?? undefined
	});

	try {
		const verified = await jwtVerify<CertificateJWTPayload>(jwt, imported, {
			requiredClaims: certificateRequiredClaims,
			algorithms: [certificateAlg]
		});

		return {
			fullName: verified.payload.n,
			conferenceTitle: verified.payload.t,
			conferenceStartDate: verified.payload.s ? new Date(verified.payload.s) : undefined,
			conferenceEndDate: verified.payload.e ? new Date(verified.payload.e) : undefined
		};
	} catch (error) {
		console.error('JWT verification failed:', error);
		return {
			fullName: undefined,
			conferenceTitle: undefined,
			conferenceStartDate: undefined,
			conferenceEndDate: undefined
		};
	}
}
