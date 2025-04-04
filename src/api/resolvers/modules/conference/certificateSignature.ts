import { builder } from '$api/resolvers/builder';
import { generateSeededRsa } from '$api/services/deterministicRSAKeypair';
import { configPrivate } from '$config/private';
import { db } from '$db/db';
import { findUniqueConferenceParticipantStatusQueryObject } from '$db/generated/graphql/ConferenceParticipantStatus';
import formatNames from '$lib/services/formatNames';
import { importPKCS8, SignJWT } from 'jose';
import { subtle, randomBytes } from 'node:crypto';

const envSecret = configPrivate.CERTIFICATE_SECRET;
const issuer = 'munify-delegator';
const audience = 'munify-delegator-pdf-certificate';
const alg = 'RS256';
const requiredClaims = [
	'fullName',
	'conferenceTitle',
	'conferenceStartDateISOString',
	'conferenceEndDateISOString'
];

//TODO: investigate performance
const keyPair = generateSeededRsa(envSecret, { bits: 2048 });

export interface CertificateJWTPayload extends Record<string, unknown> {
	fullName: string;
	conferenceTitle: string;
	conferenceStartDateISOString: string;
	conferenceEndDateISOString: string;
}

export const CryptoKeyTypeEnum = builder.enumType('CryptoKeyType', {
	values: ['private', 'public', 'secret'] as const
});

export const CryptoKeyUsagesEnum = builder.enumType('CryptoKeyUsages', {
	values: [
		'decrypt',
		'deriveBits',
		'deriveKey',
		'encrypt',
		'sign',
		'unwrapKey',
		'verify',
		'wrapKey'
	] as const
});

const GraphqlCryptoKey = builder.simpleObject('CryptoKey', {
	fields: (t) => ({
		algorithm: t.field({
			type: t.builder.simpleObject('KeyAlgorithm', { fields: (t) => ({ name: t.string() }) })
		}),
		extractable: t.boolean(),
		type: t.field({
			type: CryptoKeyTypeEnum
		}),
		usages: t.field({
			type: [CryptoKeyUsagesEnum]
		})
	})
});

builder.queryFields((t) => {
	const field = findUniqueConferenceParticipantStatusQueryObject(t);
	return {
		getCertificateJWT: t.field({
			type: t.builder.simpleObject('CertificateJWT', {
				fields: (t) => ({
					jwt: t.string(),
					publicKey: t.field({
						type: GraphqlCryptoKey
					}),
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

				const tokenPayload: CertificateJWTPayload = {
					conferenceTitle: conference.longTitle || conference.title,
					conferenceStartDateISOString: conference.startConference.toISOString(),
					conferenceEndDateISOString: conference.endConference.toISOString(),
					fullName
				};

				const jwt = await new SignJWT(tokenPayload)
					.setProtectedHeader({ alg })
					.setIssuedAt()
					.setIssuer(issuer)
					.setAudience(audience)
					.sign((await keyPair).privateKey);

				return {
					jwt,
					publicKey: (await keyPair).publicKey,
					fullName
				};
			}
		})
	};
});
