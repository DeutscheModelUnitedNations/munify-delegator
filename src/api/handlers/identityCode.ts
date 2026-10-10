import { schemaBuilder } from '$api/rumble';
import { identityPublicKey, issueIdentityCode } from '$api/services/identityCode';

const IdentityCode = schemaBuilder.simpleObject('IdentityCode', {
	fields: (t) => ({ code: t.string() })
});

const IdentityCodePublicKey = schemaBuilder.simpleObject('IdentityCodePublicKey', {
	fields: (t) => ({ publicKey: t.string() })
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * A fresh identity code for the caller, to show as a QR code for the team to scan. A mutation
	 * so no client cache can hand back an old, expired one; it writes nothing, so it publishes
	 * nothing. Only ever the caller's own id is signed.
	 */
	issueIdentityCode: t.field({
		type: IdentityCode,
		resolve: async (_root, _args, ctx) => ({
			code: await issueIdentityCode(ctx.mustBeLoggedIn().sub)
		})
	})
}));

schemaBuilder.queryFields((t) => ({
	/** The public key identity codes are checked against, raw and base64url. Public by nature. */
	identityCodePublicKey: t.field({
		type: IdentityCodePublicKey,
		resolve: async (_root, _args, ctx) => {
			ctx.mustBeLoggedIn();
			return { publicKey: await identityPublicKey() };
		}
	})
}));
