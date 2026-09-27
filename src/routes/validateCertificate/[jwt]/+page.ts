import { client } from '$lib/api/rumbleClient/client';
import { importJWK, jwtVerify } from 'jose';
import type { PageLoad } from './$types';
import { certificateAlg, certificateRequiredClaims } from '$api/handlers/certificateConfig';
import type { CertificateJWTPayload } from '$api/handlers/certificate';

export const load: PageLoad = async (event) => {
	const { params } = event;

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
		const jwt = await jwtVerify<CertificateJWTPayload>(params.jwt, imported, {
			requiredClaims: certificateRequiredClaims,
			algorithms: [certificateAlg]
		});

		return {
			fullName: jwt.payload.n,
			conferenceTitle: jwt.payload.t,
			conferenceStartDate: jwt.payload.s ? new Date(jwt.payload.s) : undefined,
			conferenceEndDate: jwt.payload.e ? new Date(jwt.payload.e) : undefined
		};
	} catch (error) {
		console.error('JWT verification failed:', error);
		return {};
	}
};
