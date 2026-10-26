import { db } from '#api/db/db.js';
import { schemaBuilder } from '#api/rumble.js';
import { generateSeededRsa } from './deterministicRSAKeypair';
import { CERTIFICATE_SECRET } from '$app/env/private';
import { certificateContents, certificateSessions } from './certificatePayload';
import { assertFindFirstExists } from '@m1212e/rumble';
import { SignJWT, exportJWK } from 'jose';
import { certificateAlg } from '../certificateConfig/certificateConfig';
import { assertCanGetCertificate } from './certificatePermissions';

/**
 * Participation certificates are signed so they can be verified offline, by anyone, without
 * calling back into this app. The key pair is derived deterministically from a single secret so
 * it survives redeploys - rotating `CERTIFICATE_SECRET` invalidates every certificate issued.
 */
const keyPair = generateSeededRsa(CERTIFICATE_SECRET, { bits: 2048 });

const jwkPublicKey = exportJWK((await keyPair).publicKey).then((key) => {
	key.alg = certificateAlg;
	return key;
});

export type { CertificateJWTPayload } from './certificatePayload';

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

const CertificateSession = schemaBuilder.simpleObject('CertificateSession', {
	fields: (t) => ({
		name: t.string(),
		attended: t.boolean()
	})
});

const CertificateJWT = schemaBuilder.simpleObject('CertificateJWT', {
	fields: (t) => ({
		jwt: t.string({ nullable: true }),
		fullName: t.string({ nullable: true }),
		/** The conference's check-in occasions, ticked where the holder was checked in. */
		sessions: t.field({ type: [CertificateSession] })
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
			await assertCanGetCertificate(ctx, args.conferenceId, args.userId);

			const status = await db.query.conferenceParticipant
				.findFirst({
					...(await ctx.abilities.conferenceParticipant.filter('read')).merge({
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

			const sessions = certificateSessions(
				(
					await db.query.attendanceSession.findMany({
						where: { conferenceId: args.conferenceId },
						columns: { occasion: true, startedAt: true, showOnCertificate: true },
						// only the holder's own scan, if any
						with: {
							entries: {
								where: { conferenceParticipantId: status.id },
								columns: { id: true },
								limit: 1
							}
						}
					})
				).map((session) => ({
					occasion: session.occasion,
					startedAt: session.startedAt,
					showOnCertificate: session.showOnCertificate,
					attended: session.entries.length > 0
				}))
			);

			const contents = certificateContents({ ...status, sessions });
			if (!contents) {
				return { jwt: null, fullName: null, sessions: [] };
			}

			const jwt = await new SignJWT(contents.payload)
				.setProtectedHeader({ alg: certificateAlg })
				.setIssuedAt()
				.sign((await keyPair).privateKey);

			return { jwt, fullName: contents.fullName, sessions };
		}
	}),

	/** The public half, so certificates can be verified without this app. */
	getCertificateJWTPublicKeyObject: t.field({
		type: JWK,
		resolve: async () => await jwkPublicKey
	})
}));
