import { z } from 'zod';
import { object, query, schemaBuilder } from '#api/rumble';
import { m } from '#lib/paraglide/messages';
import {
	assertCanManageChaseLink,
	assertPendingChaseCaller,
	isLinkedChaseCaller,
	registerInstanceLinkAbilities
} from './chaseLinkPermissions';
import { confirmChaseLink, freezeChaseLink, requestChaseLink } from './chaseLinkService';
import { chaseUrlSchema } from '#lib/schemata/chaseLink';

registerInstanceLinkAbilities();

export const InstanceLinkRef = object({ table: 'instanceLink' });
query({ table: 'instanceLink' });

schemaBuilder.mutationFields((t) => ({
	requestChaseLink: t.field({
		description:
			'Asks a MUNify CHASE instance to link with this one. The link waits until an admin there approves it, comparing the confirmation code both sides show. CONFLICT when a link exists or CHASE does not answer.',
		type: 'ID',
		args: { chaseUrl: t.arg.string({ required: true }).validate(chaseUrlSchema) },
		resolve: async (_root, args, ctx) => {
			assertCanManageChaseLink(ctx);
			return requestChaseLink({ chaseUrl: args.chaseUrl, ownUrl: ctx.requestUrl().origin });
		}
	}),

	confirmChaseLink: t.field({
		description:
			'Called by the CHASE instance whose admin approved the pending request, with the token this instance calls it with.',
		type: 'Boolean',
		args: {
			confirmationCode: t.arg.string({ required: true }),
			token: t.arg
				.string({ required: true })
				.validate(z.string().min(32, { error: () => m.chaseLinkNotPending() }))
		},
		resolve: async (_root, args, ctx) => {
			await assertPendingChaseCaller(ctx);
			const caller = await ctx.linkCaller();
			if (!caller) return false;
			await confirmChaseLink({
				linkId: caller.id,
				confirmationCode: args.confirmationCode,
				token: args.token
			});
			return true;
		}
	}),

	unlinkChase: t.field({
		description:
			'Ends the link, or withdraws a pending request. Both sides keep what they have. Called by a system admin here, or by CHASE when it unlinks.',
		type: 'Boolean',
		resolve: async (_root, _args, ctx) => {
			const byRemote = await isLinkedChaseCaller(ctx);
			if (!byRemote) assertCanManageChaseLink(ctx);
			await freezeChaseLink({ notifyRemote: !byRemote });
			return true;
		}
	})
}));
