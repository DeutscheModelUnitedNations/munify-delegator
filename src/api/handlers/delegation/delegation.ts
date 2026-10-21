import { db, schema } from '$api/db/db';
import { object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	createDelegationWithHead,
	previewDelegationByEntryCode,
	updateDelegationDetails
} from './delegationService';
import {
	assertCanDeleteDelegation,
	assertCanUpdateDelegation,
	registerDelegationAbilities
} from './delegationPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { delegationMemberPubsub, delegationPubsub, schoolPubsub } from '$api/pubsub';

registerDelegationAbilities();

const DelegationRef = object({ table: 'delegation' });
query({ table: 'delegation' });
countQuery({ table: 'delegation' });
schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** An existing school, or `schoolName` to find or create one; neither for no school. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const createdId = await createDelegationWithHead(ctx.mustBeLoggedIn().sub, args);

			delegationPubsub.created();
			delegationMemberPubsub.created();
			if (args.schoolName) schoolPubsub.created();

			return db.query.delegation
				.findFirst(
					query(
						(await ctx.abilities.delegation.filter('read')).merge({ where: { id: createdId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean(),
			resetEntryCode: t.arg.boolean(),
			newHeadDelegateUserId: t.arg.id(),
			/** Both null removes the school; both left out keeps it. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const delegation = await assertCanUpdateDelegation(ctx, args.id);
			await updateDelegationDetails(delegation, args);

			delegationPubsub.updated(args.id);
			if (args.schoolName) schoolPubsub.created();
			// A new head delegate flips the flag on two members.
			if (args.newHeadDelegateUserId) {
				delegationMemberPubsub.updated();
			}

			return db.query.delegation
				.findFirst(
					query(
						(await ctx.abilities.delegation.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegation: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteDelegation(ctx, args.id);
			await db.delete(schema.delegation).where(eq(schema.delegation.id, args.id));
			delegationPubsub.removed();
			delegationMemberPubsub.removed();

			return true;
		}
	})
}));

const DelegationPreview = schemaBuilder.simpleObject('DelegationPreview', {
	fields: (t) => ({
		id: t.string(),
		conferenceId: t.string(),
		entryCode: t.string(),
		motivation: t.string({ nullable: true }),
		school: t.string({ nullable: true }),
		experience: t.string({ nullable: true }),
		memberCount: t.int(),
		headDelegateFullName: t.string(),
		applied: t.boolean(),
		conferenceTitle: t.string()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * What somebody sees after entering a delegation's join code, before committing to join.
	 *
	 * Deliberately not ability-filtered: the caller is by definition not a member yet. Knowing the
	 * entry code is the authorisation, which is why it only needs a logged-in user.
	 */
	previewDelegation: t.field({
		type: DelegationPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			ctx.mustBeLoggedIn();

			return previewDelegationByEntryCode(args.conferenceId, args.entryCode);
		}
	})
}));
