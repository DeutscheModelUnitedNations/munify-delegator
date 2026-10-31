import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanCreateAgendaItem,
	assertCanDeleteAgendaItem,
	assertCanSetAgendaItemReviewHelpStatus,
	assertCanUpdateAgendaItem,
	registerCommitteeAgendaItemAbilities
} from './committeeAgendaItemPermissions';
import {
	createAgendaItem,
	deleteAgendaItem,
	setReviewHelpStatus,
	updateAgendaItem
} from './committeeAgendaItemService';

registerCommitteeAgendaItemAbilities();

export const CommitteeAgendaItemRef = object({ table: 'committeeAgendaItem' });
query({ table: 'committeeAgendaItem' });

const reviewHelpStatusEnum = enum_({ tsName: 'reviewHelpStatus' });

/** The agenda item as the caller may read it, for re-reading the row a mutation wrote. */
async function readableAgendaItem({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.committeeAgendaItem.filter('read')).merge({ where: { id } }).query
		.single;
}

schemaBuilder.mutationFields((t) => ({
	createAgendaItem: t.drizzleField({
		description:
			'Adds an agenda item (a topic) to a committee: `planSeats` (project management and content lead) in its conference. NOT_FOUND otherwise.',
		type: CommitteeAgendaItemRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAgendaItem({ ctx, committeeId: args.committeeId });
			const id = await createAgendaItem(args);

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateAgendaItem: t.drizzleField({
		description: 'Changes the given fields of an agenda item; left out or `null` keeps a field.',
		type: CommitteeAgendaItemRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			teaserText: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateAgendaItem({ ctx, id: args.id });
			await updateAgendaItem(args);

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteAgendaItem: t.field({
		description: 'Deletes an agenda item; its papers stay, without an agenda item.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteAgendaItem({ ctx, id: args.id });
			await deleteAgendaItem(args.id);
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
			await setReviewHelpStatus({ id: args.agendaItemId, status: args.status });

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id: args.agendaItemId })))
				.then(assertFindFirstExists);
		}
	})
}));
