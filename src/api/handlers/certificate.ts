import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { generateSeededRsa } from '$api/services/deterministicRSAKeypair';
import { configPrivate } from '$config/private';
import formatNames from '$lib/helpers/formatNames';
import { assertFindFirstExists } from '@m1212e/rumble';
import { SignJWT, exportJWK } from 'jose';
import { certificateAlg } from './certificateConfig';

/**
 * Participation certificates are signed so they can be verified offline, by anyone, without
 * calling back into this app. The key pair is derived deterministically from a single secret so
 * it survives redeploys - rotating `CERTIFICATE_SECRET` invalidates every certificate issued.
 */
const keyPair = generateSeededRsa(configPrivate.CERTIFICATE_SECRET, { bits: 2048 });

const jwkPublicKey = exportJWK((await keyPair).publicKey).then((key) => {
	key.alg = certificateAlg;
	return key;
});

export interface CertificateJWTPayload extends Record<string, unknown> {
	/** Deliberately terse: these end up in a QR code, so every byte counts. */
	n: string;
	t: string;
	s: number;
	e: number;
}

const JWK = schemaBuilder.simpleObject('JWK', {
	fields: (t) => ({
		alg: t.string({ nullable: true }),
		crv: t.string({ nullable: true }),
		d: t.string({ nullable: true }),
		dp: t.string({ nullable: true }),
		dq: t.string({ nullable: true }),
		e: t.string({ nullable: true }),
		k: t.string({ nullable: true }),
		kty: t.string({ nullable: true }),
		n: t.string({ nullable: true }),
		p: t.string({ nullable: true }),
		q: t.string({ nullable: true }),
		qi: t.string({ nullable: true }),
		use: t.string({ nullable: true }),
		x: t.string({ nullable: true }),
		y: t.string({ nullable: true })
	})
});

const CertificateJWT = schemaBuilder.simpleObject('CertificateJWT', {
	fields: (t) => ({
		jwt: t.string({ nullable: true }),
		fullName: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Issues a signed participation certificate, but only once attendance is recorded - an absent
	 * participant gets nulls rather than an error, so the UI can say "not yet available".
	 */
	getCertificateJWT: t.field({
		type: CertificateJWT,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const status = await db.query.conferenceParticipantStatus
				.findFirst({
					...ctx.abilities.conferenceParticipantStatus.filter('read').merge({
						where: { conferenceId: args.conferenceId, userId: args.userId }
					}).query.single,
					with: {
						conference: {
							columns: {
								title: true,
								longTitle: true,
								startConference: true,
								endConference: true
							}
						},
						user: { columns: { givenName: true, familyName: true } }
					}
				})
				.then(assertFindFirstExists);

			if (!status.didAttend || !status.conference) {
				return { jwt: null, fullName: null };
			}

			const fullName = formatNames(status.user?.givenName, status.user?.familyName, {
				familyNameUppercase: false,
				givenNameUppercase: false
			});

			const payload: CertificateJWTPayload = {
				n: fullName,
				t: status.conference.longTitle || status.conference.title,
				s: status.conference.startConference?.getTime() ?? 0,
				e: status.conference.endConference?.getTime() ?? 0
			};

			const jwt = await new SignJWT(payload)
				.setProtectedHeader({ alg: certificateAlg })
				.setIssuedAt()
				.sign((await keyPair).privateKey);

			return { jwt, fullName };
		}
	}),

	/** The public half, so certificates can be verified without this app. */
	getCertificateJWTPublicKeyObject: t.field({
		type: JWK,
		resolve: async () => await jwkPublicKey
	})
}));
