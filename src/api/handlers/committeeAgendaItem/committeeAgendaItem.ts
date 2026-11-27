import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanCreateAgendaItem,
	assertCanDeleteAgendaItem,
	assertCanSetAgendaItemDiscussionPoints,
	assertCanSetAgendaItemReviewHelpStatus,
	assertCanUpdateAgendaItem,
	registerCommitteeAgendaItemAbilities
} from './committeeAgendaItemPermissions';
import { createAgendaItem, deleteAgendaItem, updateAgendaItem } from './committeeAgendaItemService';
import { mcpTool } from '#api/mcp/mcpTool';
import { discussionPointsSchema } from '#lib/schemata/discussionPoints';

registerCommitteeAgendaItemAbilities();

export const CommitteeAgendaItemRef = object({
	table: 'committeeAgendaItem',
	search: { columns: ['title', 'id'] }
});
query({ table: 'committeeAgendaItem' });

const reviewHelpStatusEnum = enum_({ tsName: 'reviewHelpStatus' });

/** The agenda item as the caller may read it, for re-reading the row a mutation wrote. */
async function readableAgendaItem({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.committeeAgendaItem.filter('read')).merge({ where: { id } }).query
		.single;
}

schemaBuilder.mutationFields((t) => ({
	createAgendaItem: t.drizzleField({
		extensions: mcpTool({ textArguments: ['title', 'teaserText', 'discussionPoints'] }),
		description:
			'Adds an agenda item (a topic) to a committee: `planSeats` (project management and content lead) in its conference. NOT_FOUND otherwise. `discussionPoints` are its points for discussion, one line each, in order.',
		type: CommitteeAgendaItemRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			title: t.arg.string({ required: true }),
			teaserText: t.arg.string(),
			discussionPoints: t.arg.stringList().validate(discussionPointsSchema().nullish())
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
		extensions: mcpTool({ textArguments: ['title', 'teaserText', 'discussionPoints'] }),
		description:
			'Changes the given fields of an agenda item; left out or `null` keeps a field. `discussionPoints` replaces the whole list of points for discussion (one line each, in order; `[]` clears it).',
		type: CommitteeAgendaItemRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			teaserText: t.arg.string(),
			discussionPoints: t.arg.stringList().validate(discussionPointsSchema().nullish())
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateAgendaItem({ ctx, id: args.id });
			await updateAgendaItem(args);

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setAgendaItemDiscussionPoints: t.drizzleField({
		extensions: mcpTool({ textArguments: ['discussionPoints'] }),
		description:
			"Replaces an agenda item's points for discussion (one line each, in order; `[]` clears them): `planSeats` or `editGuide` in its conference, so guide editors set them without otherwise editing the agenda item. Authors and reviewers see them at once; guide pages show them where `{{Diskussionspunkte}}` stands, else below the title.",
		type: CommitteeAgendaItemRef,
		args: {
			agendaItemId: t.arg.id({ required: true }),
			discussionPoints: t.arg.stringList({ required: true }).validate(discussionPointsSchema())
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetAgendaItemDiscussionPoints({ ctx, agendaItemId: args.agendaItemId });
			await updateAgendaItem({ id: args.agendaItemId, discussionPoints: args.discussionPoints });

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id: args.agendaItemId })))
				.then(assertFindFirstExists);
		}
	}),

	deleteAgendaItem: t.field({
		extensions: mcpTool(),
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
			await updateAgendaItem({ id: args.agendaItemId, reviewHelpStatus: args.status });

			return db.query.committeeAgendaItem
				.findFirst(query(await readableAgendaItem({ ctx, id: args.agendaItemId })))
				.then(assertFindFirstExists);
		}
	})
}));
