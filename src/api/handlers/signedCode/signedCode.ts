import { schemaBuilder } from '#api/rumble';
import { assertCanIssuePrintCode } from './signedCodePermissions';
import { issueLiveCode, issuePrintCode } from './signedCodeService';
import { signedCodeKeys } from './signingKeys';

const SignedCode = schemaBuilder.simpleObject('SignedCode', {
	description:
		'A signed code in the scanner safe alphabet; `signedCodeLink` (`#lib/signedCode/signedCode`) makes it the link a QR code shows.',
	fields: (t) => ({ code: t.string() })
});

const SignedCodeKey = schemaBuilder.simpleObject('SignedCodeKey', {
	description: 'A public key signed codes are checked against.',
	fields: (t) => ({
		kid: t.int({ description: 'The key id codes name in their `kid` header.' }),
		publicKey: t.string({ description: 'The Ed25519 public key, raw and base64url.' })
	})
});

schemaBuilder.mutationFields((t) => ({
	issueNametagCode: t.field({
		description:
			"A fresh code for the caller's digital nametag in the conference, good for ten minutes, to show as a QR code for the team to scan. A mutation so no client cache can hand back an old, expired one; it writes nothing, so it publishes nothing. Only ever the caller's own id is signed.",
		type: SignedCode,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => ({
			code: await issueLiveCode({
				userId: ctx.mustBeLoggedIn().sub,
				conferenceId: args.conferenceId
			})
		})
	}),

	issueDocumentCode: t.field({
		description:
			"The code printed on a person's application documents in the conference, for the holder themselves and participant care (FORBIDDEN for anybody else). It writes nothing, so it publishes nothing.",
		type: SignedCode,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true, description: "The holder's user id." })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanIssuePrintCode({ ctx, conferenceId: args.conferenceId, userId: args.userId });
			return { code: await issuePrintCode(args) };
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	signedCodeKeys: t.field({
		description:
			'The public keys signed codes are checked against, so a scanner checks them without asking the server and anybody can check a certificate. Open to anybody.',
		type: [SignedCodeKey],
		resolve: async () =>
			[...(await signedCodeKeys())].map(([kid, publicKey]) => ({ kid, publicKey }))
	})
}));
