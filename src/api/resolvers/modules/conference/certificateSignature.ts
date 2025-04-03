import { builder } from '$api/resolvers/builder';
import { configPrivate } from '$config/private';
import { db } from '$db/db';
import { findUniqueConferenceParticipantStatusQueryObject } from '$db/generated/graphql/ConferenceParticipantStatus';
import formatNames from '$lib/services/formatNames';
import { importPKCS8, SignJWT } from 'jose';
import { subtle, randomBytes } from 'node:crypto';

export interface CertificateJWTPayload extends Record<string, unknown> {
	fullName: string;
	conferenceTitle: string;
	conferenceStartDateISOString: string;
	conferenceEndDateISOString: string;
}

builder.queryFields((t) => {
	const field = findUniqueConferenceParticipantStatusQueryObject(t);
	return {
		getCertificateJWT: t.field({
			type: t.builder.simpleObject('CertificateJWT', {
				fields: (t) => ({
					jwt: t.string(),
					publicKey: t.string(),
					fullName: t.string()
				})
			}),
			args: field.args,
			resolve: async (root, args, ctx) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').ConferenceParticipantStatus]
				};

				const conferenceParticipantStatus = await db.conferenceParticipantStatus.findUniqueOrThrow({
					...args,
					include: {
						conference: {
							select: {
								title: true,
								longTitle: true,
								startConference: true,
								endConference: true
							}
						},
						user: {
							select: {
								given_name: true,
								family_name: true
							}
						}
					}
				});

				if (!conferenceParticipantStatus.didAttend) {
					throw new Error('Participant did not attend the conference');
				}

				const { user, conference } = conferenceParticipantStatus;

				const fullName = formatNames(user.given_name, user.family_name, {
					familyNameUppercase: false,
					givenNameUppercase: false
				});

				// const tokenPayload: CertificateJWTPayload = {
				// 	conferenceTitle: conference.longTitle || conference.title,
				// 	conferenceStartDateISOString: conference.startConference.toISOString(),
				// 	conferenceEndDateISOString: conference.endConference.toISOString(),
				// 	fullName:
				// };

				// 	const encoder = new TextEncoder();
				// 	const secretKeyData = encoder.encode(configPrivate.CERTIFICATE_SECRET);
				// 	const secretKey = await subtle.importKey('raw', secretKeyData, { name: 'PBKDF2' }, false, [
				// 		'deriveBits',
				// 		'deriveKey'
				// 	]);

				// 	const pubKeyObject = crypto.createPublicKey({
				// 		key: privateKey,
				// 		format: 'pem'
				// })

				// const publicKey = pubKeyObject.export({
				// 		format: 'pem',
				// 		type: 'spki'
				// })

				// Derive a key pair from the secret key
				// const keyPair = await subtle.deriveKey(
				// 	{
				// 		name: 'PBKDF2',
				// 		salt: randomBytes(16),
				// 		iterations: 100000,
				// 		hash: 'SHA-256'
				// 	},
				// 	secretKey,
				// 	{
				// 		name: 'ECDSA',
				// 	},
				// 	true,
				// 	['sign', 'verify']
				// );

				// const privateKey = await importPKCS8(
				// 	configPrivate.CERTIFICATE_PRIVATE_KEY,
				// 	configPrivate.CERTIFICATE_PRIVATE_KEY_ALG
				// );

				// const jwt = await new SignJWT(tokenPayload)
				// 	.setProtectedHeader({ alg: 'HS256' })
				// 	.setIssuedAt()
				// 	.setIssuer('munify-delegator')
				// 	.setAudience('certificate-pdf')
				// 	.sign(privateKey);

				// return {
				// 	jwt,
				// 	publicKey,
				// 	fullName
				// };
			}
		})
	};
});
