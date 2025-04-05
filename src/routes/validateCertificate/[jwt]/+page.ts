import { graphql } from '$houdini';
import { importJWK, exportSPKI, jwtVerify, type JWK, type KeyLike } from 'jose';
import type { PageLoad } from './$houdini';
import {
	certificateAlg,
	certificateRequiredClaims
} from '$api/resolvers/modules/conference/certificateConfig';
import type { CertificateJWTPayload } from '$api/resolvers/modules/conference/certificateSignature';

export const load: PageLoad = async (event) => {
	const { params } = event;

	const publicKeyQuery = graphql(`
		query LoadJWTPublicKey @load {
			getCertificateJWTPublicKeyObject {
				alg
				e
				n
				kty
			}
		}
	`);

	const publicKeyData = await publicKeyQuery.fetch({ event, blocking: true });
	const jwk = publicKeyData.data?.getCertificateJWTPublicKeyObject;

	if (!jwk) {
		throw new Error('Missing JWK public key');
	}

	const imported = await importJWK(jwk as JWK);
	// const spkiPublicKey = await exportSPKI(jwk as JWK);

	try {
		const jwt = await jwtVerify(params.jwt, imported, {
			requiredClaims: certificateRequiredClaims,
			algorithms: [certificateAlg]
		});
		const payload = jwt.payload as CertificateJWTPayload;
		const fullName = payload.n;
		const conferenceTitle = payload.t;
		const conferenceStartDate = payload.s ? new Date(payload.s) : undefined;
		const conferenceEndDate = payload.e ? new Date(payload.e) : undefined;

		return {
			fullName,
			conferenceTitle,
			conferenceStartDate,
			conferenceEndDate
			// spkiPublicKey
		};
	} catch (error) {
		console.error('JWT verification failed:', error);
		return {
			// spkiPublicKey
		};
	}
};
