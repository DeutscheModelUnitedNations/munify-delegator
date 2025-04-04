import { builder } from '$api/resolvers/builder';
import { generateSeededRsa } from '$api/services/deterministicRSAKeypair';
import { configPrivate } from '$config/private';
import { db } from '$db/db';
import { findUniqueConferenceParticipantStatusQueryObject } from '$db/generated/graphql/ConferenceParticipantStatus';
import formatNames from '$lib/services/formatNames';
import { importPKCS8, SignJWT, exportJWK } from 'jose';
import { certificateAlg } from './certificateConfig';

const envSecret = configPrivate.CERTIFICATE_SECRET;

//TODO: investigate performance
const keyPair = generateSeededRsa(envSecret, { bits: 2048 });
const jwkPublicKey = exportJWK((await keyPair).publicKey).then((k) => {
	k.alg = certificateAlg;
	return k;
});
export interface CertificateJWTPayload extends Record<string, unknown> {
	n: string; // user full name
	t: string; // conference title
	s: number; // conference start date
	e: number; // conference end date
}

const GraphqlJWK = builder.simpleObject('JWK', {
	fields: (t) => ({
		alg: t.string({
			nullable: true
		}),
		crv: t.string({
			nullable: true
		}),
		d: t.string({
			nullable: true
		}),
		dp: t.string({
			nullable: true
		}),
		dq: t.string({
			nullable: true
		}),
		e: t.string({
			nullable: true
		}),
		ext: t.boolean({
			nullable: true
		}),
		k: t.string({
			nullable: true
		}),
		key_ops: t.stringList({
			nullable: true
		}),
		kty: t.string({
			nullable: true
		}),
		n: t.string({
			nullable: true
		}),
		oth: t.field({
			type: [
				t.builder.simpleObject('RsaOtherPrimesInfo', {
					fields: (t) => ({
						d: t.string({ nullable: true }),
						r: t.string({ nullable: true }),
						t: t.string({ nullable: true })
					})
				})
			],
			nullable: true
		}),
		p: t.string({
			nullable: true
		}),
		q: t.string({
			nullable: true
		}),
		qi: t.string({
			nullable: true
		}),
		use: t.string({
			nullable: true
		}),
		x: t.string({
			nullable: true
		}),
		y: t.string({
			nullable: true
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
					n: fullName,
					t: conference.longTitle || conference.title,
					s: conference.startConference.getTime(),
					e: conference.endConference.getTime()
				};

				const jwt = await new SignJWT(tokenPayload)
					.setProtectedHeader({ alg: certificateAlg })
					.setIssuedAt()
					.sign((await keyPair).privateKey);

				return {
					jwt,
					fullName
				};
			}
		})
	};
});

builder.queryFields((t) => {
	return {
		getCertificateJWTPublicKeyObject: t.field({
			type: GraphqlJWK,
			resolve: async (root, _args, ctx) => {
				return await jwkPublicKey;
			}
		})
	};
});
