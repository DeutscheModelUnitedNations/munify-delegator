import { schemaBuilder } from '#api/rumble';
import { POSTAL_DOCUMENTS } from '#lib/paperScan/pageAreas';
import { assertCanIssuePrintCodes } from './signedCodePermissions';
import { documentCodesArgsSchema, issueLiveCode, issuePrintCodes } from './signedCodeService';
import { signedCodeKeys } from './signingKeys';

const SignedCode = schemaBuilder.simpleObject('SignedCode', {
	description:
		'A signed code in the scanner safe alphabet; `signedCodeLink` (`#lib/signedCode/signedCode`) makes it the link a QR code shows.',
	fields: (t) => ({ code: t.string() })
});

const PostalDocumentEnum = schemaBuilder.enumType('PostalDocument', { values: POSTAL_DOCUMENTS });

const ClearSpanInput = schemaBuilder.inputType('ClearSpanInput', {
	description: 'A part of a field, in millimetres from its top.',
	fields: (t) => ({
		top: t.float({ required: true }),
		bottom: t.float({ required: true })
	})
});

const PrintedInkInput = schemaBuilder.inputType('PrintedInkInput', {
	description: 'What a page prints in one of its fields itself, as shares of the field.',
	fields: (t) => ({
		field: t.string({ required: true }),
		ink: t.float({ required: true }),
		core: t.float({ required: true, description: 'The share of its middle.' }),
		clear: t.field({
			type: ClearSpanInput,
			description: "The part of a line's field between the template's own lines."
		})
	})
});

const PrintedPageInput = schemaBuilder.inputType('PrintedPageInput', {
	description: 'A page of the application documents.',
	fields: (t) => ({
		document: t.field({ type: PostalDocumentEnum, required: true }),
		page: t.int({ required: true, description: "Which page of the document's template, from 0." }),
		width: t.float({ required: true, description: 'The page size in points.' }),
		height: t.float({ required: true }),
		printedInk: t.field({
			type: [PrintedInkInput],
			description:
				'The fields the page prints something in before anybody fills them in. Null when nobody measured it: a person looks at all fields of the page then.'
		})
	})
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

	issueDocumentCodes: t.field({
		description:
			"The codes printed on the pages of a person's application documents in the conference, one per page in the order given, for the holder themselves and participant care (FORBIDDEN for anybody else). Each carries where its page's alignment marks and fields are. `layouts` stand in for the stored ones in a test print of a layout being edited, for those who may edit it (FORBIDDEN otherwise). It writes nothing, so it publishes nothing.",
		type: [SignedCode],
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true, description: "The holder's user id." }),
			pages: t.arg({ type: [PrintedPageInput], required: true }),
			layouts: t.arg({ type: 'JSON', description: 'A test print: the layouts being edited.' })
		},
		validate: documentCodesArgsSchema,
		resolve: async (_root, args, ctx) => {
			const { conferenceId, userId, layouts } = args;
			const draft = layouts == null ? undefined : { layouts };
			await assertCanIssuePrintCodes({ ctx, conferenceId, userId, draft: draft !== undefined });
			const codes = await issuePrintCodes({ userId, conferenceId, pages: args.pages, draft });
			return codes.map((code) => ({ code }));
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
