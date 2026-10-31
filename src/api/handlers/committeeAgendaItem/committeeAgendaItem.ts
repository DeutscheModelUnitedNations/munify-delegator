import { db, schema } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { committeeAgendaItemPubsub } from '#api/pubsub';
import {
	assertCanCreateAgendaItem,
	assertCanSetAgendaItemReviewHelpStatus,
	assertCanUpdateAgendaItem,
	registerCommitteeAgendaItemAbilities
} from './committeeAgendaItemPermissions';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerCommitteeAgendaItemAbilities();

export const CommitteeAgendaItemRef = object({ table: 'committeeAgendaItem' });
query({ table: 'committeeAgendaItem' });

const reviewHelpStatusEnum = enum_({ tsName: 'reviewHelpStatus' });

schemaBuilder.mutationFields((t) => ({
	createAgendaItem: t.drizzleField({
		description: 'Adds an agenda item (a topic) to a committee.',
		type: CommitteeAgendaItemRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAgendaItem({ ctx, committeeId: args.committeeId });

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
		description: 'Changes the given fields of an agenda item; the others stay as they are.',
		type: CommitteeAgendaItemRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateAgendaItem({ ctx, id: args.id });
			await db
				.update(schema.committeeAgendaItem)
				.set({ title: args.title ?? undefined, teaserText: args.teaserText ?? undefined })
				.where(whereRows({ table: schema.committeeAgendaItem, filter: { id: args.id } }));

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
		description: 'Deletes an agenda item; its papers stay, without an agenda item.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'committeeAgendaItem', id: args.id });
			committeeAgendaItemPubsub.removed();

			return true;
		}
	}),

	setAgendaItemReviewHelpStatus: t.drizzleField({
		description:
			"Marks whether an agenda item's papers need more reviewers. Paper reviewers may set it without being able to edit the agenda item otherwise.",
		type: CommitteeAgendaItemRef,
		args: {
			agendaItemId: t.arg.id({ required: true }),
			status: t.arg({ type: reviewHelpStatusEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetAgendaItemReviewHelpStatus({ ctx, agendaItemId: args.agendaItemId });

			await db
				.update(schema.committeeAgendaItem)
				.set({ reviewHelpStatus: args.status })
				.where(whereRows({ table: schema.committeeAgendaItem, filter: { id: args.agendaItemId } }));

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
