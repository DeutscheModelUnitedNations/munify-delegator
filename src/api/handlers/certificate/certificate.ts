import { schemaBuilder } from '#api/rumble';
import { assertCanGetCertificate } from './certificatePermissions';
import { certificatePublicKey, issueCertificate } from './certificateService';

/**
 * The public key certificates are verified with. Only the members of an RSA public key: a JWK
 * type that also had the private members would be one export away from publishing them.
 */
const JWK = schemaBuilder.simpleObject('JWK', {
	description: 'The public RSA key certificates are signed with, as a JSON Web Key.',
	fields: (t) => ({
		kty: t.string({ nullable: true, description: 'The key type, `RSA`.' }),
		alg: t.string({ nullable: true, description: 'The signing algorithm, `RS256`.' }),
		n: t.string({ nullable: true, description: 'The modulus, base64url.' }),
		e: t.string({ nullable: true, description: 'The public exponent, base64url.' }),
		use: t.string({ nullable: true, description: 'What the key is for, if stated.' })
	})
});

const CertificateJWT = schemaBuilder.simpleObject('CertificateJWT', {
	description: 'A signed participation certificate, or nulls while attendance is not recorded.',
	fields: (t) => ({
		jwt: t.string({ nullable: true, description: 'The certificate, a JWT signed with RS256.' }),
		fullName: t.string({
			nullable: true,
			description: "The holder's name as the certificate states it."
		}),
		sessions: t.stringList({
			description:
				"The names of the conference's check-in occasions the holder was checked in at, in the order they started; the team can take one off the certificates."
		})
	})
});

schemaBuilder.queryFields((t) => ({
	getCertificateJWT: t.field({
		description:
			'Issues a signed participation certificate, for the holder themselves and participant care (FORBIDDEN for anybody else). NOT_FOUND for somebody without a part in the conference. Only once attendance is recorded: an absent participant gets nulls rather than an error, so the UI can say "not yet available".',
		type: CertificateJWT,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true, description: "The holder's user id." })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanGetCertificate({ ctx, conferenceId: args.conferenceId, userId: args.userId });
			return issueCertificate(args);
		}
	}),

	getCertificateJWTPublicKeyObject: t.field({
		description:
			'The public half of the signing key, so certificates can be verified without this app. Open to anybody.',
		type: JWK,
		resolve: () => certificatePublicKey()
	})
}));
