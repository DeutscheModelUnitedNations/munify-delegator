import { db, schema } from '$api/db/db';
import { enum_, object, query, schemaBuilder } from '$api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { committeeAgendaItemPubsub } from '$api/pubsub';
import {
	assertCanCreateAgendaItem,
	assertCanDeleteAgendaItem,
	assertCanSetAgendaItemReviewHelpStatus,
	assertCanUpdateAgendaItem,
	registerCommitteeAgendaItemAbilities
} from './committeeAgendaItemPermissions';

registerCommitteeAgendaItemAbilities();

export const CommitteeAgendaItemRef = object({ table: 'committeeAgendaItem' });
query({ table: 'committeeAgendaItem' });

const reviewHelpStatusEnum = enum_({ tsName: 'reviewHelpStatus' });

schemaBuilder.mutationFields((t) => ({
	createAgendaItem: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAgendaItem(ctx, args.committeeId);

			const created = await db
				.insert(schema.committeeAgendaItem)
				.values({
					committeeId: args.committeeId,
					title: args.title,
					teaserText: args.teaserText ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			committeeAgendaItemPubsub.created();

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						(await ctx.abilities.committeeAgendaItem.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateAgendaItem: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateAgendaItem(ctx, args.id);
			await db
				.update(schema.committeeAgendaItem)
				.set({ title: args.title ?? undefined, teaserText: args.teaserText ?? undefined })
				.where(eq(schema.committeeAgendaItem.id, args.id));

			committeeAgendaItemPubsub.updated(args.id);

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						(await ctx.abilities.committeeAgendaItem.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteAgendaItem: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteAgendaItem(ctx, args.id);
			await db.delete(schema.committeeAgendaItem).where(eq(schema.committeeAgendaItem.id, args.id));
			committeeAgendaItemPubsub.removed();

			return true;
		}
	}),

	setAgendaItemReviewHelpStatus: t.drizzleField({
		type: CommitteeAgendaItemRef,
		args: {
			agendaItemId: t.arg.id({ required: true }),
			status: t.arg({ type: reviewHelpStatusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetAgendaItemReviewHelpStatus(ctx, args.agendaItemId);

			await db
				.update(schema.committeeAgendaItem)
				.set({ reviewHelpStatus: args.status })
				.where(eq(schema.committeeAgendaItem.id, args.agendaItemId));

			committeeAgendaItemPubsub.updated(args.agendaItemId);

			return db.query.committeeAgendaItem
				.findFirst(
					query(
						(await ctx.abilities.committeeAgendaItem.filter('read')).merge({
							where: { id: args.agendaItemId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
