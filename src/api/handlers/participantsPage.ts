import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '$api/services/authHelper';
import { participantsCountSql, participantsPageSql } from '$api/services/participantsQuery';

const ParticipantFilterInput = schemaBuilder.inputType('ParticipantFilterInput', {
	description:
		'One column filter of the participants table. Which of the value fields applies follows from the column: text columns take `mode` and `text`, enum columns `values`, boolean columns `bool`, number columns `min` / `max`. The nation column also takes `values`, the nation codes whose (translated) name matched.',
	fields: (t) => ({
		column: t.string({ required: true }),
		mode: t.string(),
		text: t.string(),
		values: t.stringList(),
		bool: t.boolean(),
		min: t.float(),
		max: t.float()
	})
});

const ParticipantSortInput = schemaBuilder.inputType('ParticipantSortInput', {
	fields: (t) => ({
		column: t.string({ required: true }),
		desc: t.boolean({ required: true })
	})
});

const ParticipantsPage = schemaBuilder.simpleObject('ParticipantsPage', {
	description: 'The users of one page of the participants table, in the order the table shows.',
	fields: (t) => ({
		userIds: t.idList(),
		hasMore: t.boolean(),
		/** Everyone the search and filters match, across all pages */
		total: t.int()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * The users of one page of the participants table. The table merges four kinds of registration
	 * and the status of each person's paperwork into one row, so it has no list query of its own to
	 * search, filter and order by: this answers with the ordered ids, and the page reads the rows'
	 * details through the ordinary queries by id.
	 *
	 * Care team only: filtering and ordering by contact data and care status would otherwise
	 * reveal it to people who may not read it. Not live; the page refetches when it is told the
	 * registrations changed.
	 */
	participantsPage: t.field({
		type: ParticipantsPage,
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string(),
			filters: t.arg({ type: [ParticipantFilterInput] }),
			sort: t.arg({ type: [ParticipantSortInput] }),
			limit: t.arg.int({ required: true }),
			offset: t.arg.int({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const limit = Math.min(Math.max(args.limit, 1), 1000);
			const offset = Math.max(args.offset, 0);

			const [result, count] = await Promise.all([
				db.execute<{ user_id: string }>(participantsPageSql(args, limit, offset)),
				db.execute<{ total: number }>(participantsCountSql(args))
			]);

			const ids = result.rows.map((row) => row.user_id);
			return {
				userIds: ids.slice(0, limit),
				hasMore: ids.length > limit,
				total: count.rows[0]?.total ?? 0
			};
		}
	})
}));
