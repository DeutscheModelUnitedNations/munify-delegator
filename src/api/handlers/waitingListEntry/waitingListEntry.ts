import { db, schema } from '$api/db/db';
import { object, countQuery, query, schemaBuilder } from '$api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { waitingListFormSchema } from '../../../routes/(authenticated)/registration/[conferenceId]/waiting-list/form-schema';
import { nullToUndefined } from '$api/services/args';
import {
	assertCanDeleteWaitingListEntry,
	registerWaitingListEntryAbilities,
	updatableWaitingListEntry
} from './waitingListEntryPermissions';
import { waitingListEntryPubsub } from '$api/pubsub';
import { assertWaitingListOpenFor } from './waitingListEntryService';

registerWaitingListEntryAbilities();

const WaitingListEntryRef = object({ table: 'waitingListEntry' });
query({ table: 'waitingListEntry' });
countQuery({ table: 'waitingListEntry' });

schemaBuilder.mutationFields((t) => ({
	createWaitingListEntry: t.drizzleField({
		type: WaitingListEntryRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			school: t.arg.string({ required: true }),
			motivation: t.arg.string({ required: true }),
			experience: t.arg.string({ required: true }),
			requests: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			// Same zod schema the registration form uses, so the length limits stay in one place.
			waitingListFormSchema.parse({
				school: args.school,
				motivation: args.motivation,
				experience: args.experience,
				requests: args.requests
			});

			await assertWaitingListOpenFor(args.conferenceId, id);

			const created = await db
				.insert(schema.waitingListEntry)
				.values({
					conferenceId: args.conferenceId,
					userId: id,
					school: args.school,
					motivation: args.motivation,
					experience: args.experience,
					requests: nullToUndefined(args.requests)
				})
				.returning()
				.then(assertFirstEntryExists);

			waitingListEntryPubsub.created();

			return db.query.waitingListEntry
				.findFirst(
					query(
						(await ctx.abilities.waitingListEntry.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateWaitingListEntry: t.drizzleField({
		type: WaitingListEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string(),
			requests: t.arg.string(),
			hidden: t.arg.boolean(),
			assigned: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.waitingListEntry)
				.set({
					school: nullToUndefined(args.school),
					motivation: nullToUndefined(args.motivation),
					experience: nullToUndefined(args.experience),
					requests: nullToUndefined(args.requests),
					hidden: nullToUndefined(args.hidden),
					assigned: nullToUndefined(args.assigned)
				})
				.where(await updatableWaitingListEntry(ctx, args.id));

			waitingListEntryPubsub.updated(args.id);

			return db.query.waitingListEntry
				.findFirst(
					query(
						(await ctx.abilities.waitingListEntry.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteWaitingListEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteWaitingListEntry(ctx, args.id);
			await db.delete(schema.waitingListEntry).where(eq(schema.waitingListEntry.id, args.id));
			waitingListEntryPubsub.removed();

			return true;
		}
	})
}));
