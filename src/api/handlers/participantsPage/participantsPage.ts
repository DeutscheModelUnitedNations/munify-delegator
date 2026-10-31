import { schemaBuilder } from '#api/rumble';
import { assertCanReadParticipantsPage } from './participantsPagePermissions';
import { loadParticipantsPage, pageLimitSchema, pageOffsetSchema } from './participantsPageService';

const ParticipantFilterInput = schemaBuilder.inputType('ParticipantFilterInput', {
	description:
		'One column filter of the participants table. Which of the value fields applies follows from the column: text columns take `mode` and `text`, enum columns `values`, boolean columns `bool`, number columns `min` / `max`. The nation column also takes `values`, the nation codes whose (translated) name matched.',
	fields: (t) => ({
		column: t.string({
			required: true,
			description: 'The column filtered; one the table does not have is refused with INVALID_INPUT.'
		}),
		mode: t.string({
			description:
				'How a text column compares: `contains` (also for an unknown mode), `containsNot`, `equals`, `equalsNot`, `startsWith`, `startsWithNot`, `isEmpty` or `isNotEmpty`.'
		}),
		text: t.string({
			description: 'The text a text column is compared with; empty filters nothing.'
		}),
		values: t.stringList({
			description: 'The values an enum column may have; `—` stands for none. Empty filters nothing.'
		}),
		bool: t.boolean({
			description: 'The value a boolean column must have; left out filters nothing.'
		}),
		min: t.float({ description: 'The lowest value a number column may have.' }),
		max: t.float({ description: 'The highest value a number column may have.' })
	})
});

const ParticipantSortInput = schemaBuilder.inputType('ParticipantSortInput', {
	description: 'One column to order the participants table by.',
	fields: (t) => ({
		column: t.string({
			required: true,
			description:
				'The column; one the backend does not know (a column the table computes itself) is skipped.'
		}),
		desc: t.boolean({ required: true, description: 'Descending rather than ascending.' })
	})
});

const ParticipantsPage = schemaBuilder.simpleObject('ParticipantsPage', {
	description: 'The users of one page of the participants table, in the order the table shows.',
	fields: (t) => ({
		userIds: t.idList({ description: "The page's users, in order." }),
		hasMore: t.boolean({ description: 'Whether another page follows.' }),
		total: t.int({ description: 'Everyone the search and filters match, across all pages.' })
	})
});

schemaBuilder.queryFields((t) => ({
	participantsPage: t.field({
		description:
			"The users of one page of the participants table. The table merges four kinds of registration, the team and the waiting list, and the status of each person's paperwork into one row, so it has no list query of its own to search, filter and order by: this answers with the ordered ids, and the page reads the rows' details through the ordinary queries by id. Participant care only (FORBIDDEN for anybody else): filtering and ordering by contact data and care status would otherwise reveal it. A team member's address, gender and food preference count as empty for a caller who may not read them (only team admins do). Ties are ordered by family name, then id. Not live; the page refetches when it is told the registrations changed.",
		type: ParticipantsPage,
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string({
				description: 'Text the full name (given name first) or the email has to contain.'
			}),
			filters: t.arg({
				type: [ParticipantFilterInput],
				description: 'Column filters, all of which have to match.'
			}),
			sort: t.arg({
				type: [ParticipantSortInput],
				description: 'The order, most significant column first.'
			}),
			limit: t.arg
				.int({ required: true, description: 'People per page, 1 to 1000.' })
				.validate(pageLimitSchema),
			offset: t.arg
				.int({ required: true, description: 'People to skip before the page.' })
				.validate(pageOffsetSchema)
		},
		resolve: async (_root, args, ctx) => {
			const { teamDetails } = await assertCanReadParticipantsPage({
				ctx,
				conferenceId: args.conferenceId
			});
			return loadParticipantsPage({ ...args, teamDetails });
		}
	})
}));
