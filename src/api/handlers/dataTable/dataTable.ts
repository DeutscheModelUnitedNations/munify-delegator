import { schemaBuilder } from '#api/rumble';
import { assertCanReadDataTable } from './dataTablePermissions';
import { dataTableArgSchemas, loadDataTableGroups, loadDataTablePage } from './dataTableService';

const DataTablePage = schemaBuilder.simpleObject('DataTablePage', {
	description: 'One page of a data table: the rows the table shows, in its order.',
	fields: (t) => ({
		ids: t.idList({ description: "The page's rows, in order." }),
		hasMore: t.boolean({ description: 'Whether another page follows.' }),
		total: t.int({
			description: 'Every row the search and filter match within the group, across all pages.'
		}),
		values: t.field({
			type: ['JSON'],
			nullable: true,
			description:
				"The rows' column values by column id, in order, for the tables that answer them (schools); null for the others, whose rows are read through their own queries by id."
		})
	})
});

const DataTableGroup = schemaBuilder.simpleObject('DataTableGroup', {
	description: 'One group of a grouped data table.',
	fields: (t) => ({
		value: t.string({
			nullable: true,
			description:
				'What names the group (`#lib/dataGrid/grouping`): the value, a day, month or year, or the lower end of a range; null for the rows without one.'
		}),
		count: t.int({ description: 'How many rows the group holds.' })
	})
});

const QUERY_DESCRIPTION =
	'The filter tree, sorting and grouping, and the group asked for (`path`), as `#lib/dataGrid/stateSchema` describes them. Conditions, sorting and grouping on columns the table does not have count for nothing.';
const SEARCH_DESCRIPTION = 'Words that each have to occur in one of the searched columns.';

const tableArgs = schemaBuilder.args((t) => ({
	table: t
		.string({
			required: true,
			description: 'Which table: `participants`, `waitingList`, `teamMembers` or `schools`.'
		})
		.validate(dataTableArgSchemas.table),
	conferenceId: t.id({ required: true }),
	query: t
		.field({ type: 'JSON', required: true, description: QUERY_DESCRIPTION })
		.validate(dataTableArgSchemas.query),
	search: t.string({ description: SEARCH_DESCRIPTION }).validate(dataTableArgSchemas.search),
	revision: t.string({
		description:
			"Ignored; a new value makes the client ask again after the table's rows changed (the answers are not live, and the client's cache would answer the same arguments with the old ids)."
	})
}));

schemaBuilder.queryFields((t) => ({
	dataTablePage: t.field({
		description:
			"One page of a team table (participants, waiting list, team, schools), searched, filtered, sorted and - within the group `query.path` names - grouped by the backend. Answers the rows' ids; the page reads them through the ordinary queries. Each table is for the team permission its page asks for (FORBIDDEN otherwise): participant care for all but the team, which is the team admins'. Columns the caller may not read of a row (a teammate's address) count as empty. Not live: the page asks again when the rows it shows change.",
		type: DataTablePage,
		args: {
			...tableArgs,
			limit: t.arg
				.int({ required: true, description: 'Rows per page, 1 to 1000.' })
				.validate(dataTableArgSchemas.limit),
			offset: t.arg
				.int({ required: true, description: 'Rows to skip before the page.' })
				.validate(dataTableArgSchemas.offset)
		},
		resolve: async (_root, args, ctx) => {
			const access = await assertCanReadDataTable({
				ctx,
				table: args.table,
				conferenceId: args.conferenceId
			});
			return loadDataTablePage({ ...args, access });
		}
	}),

	dataTableGroups: t.field({
		description:
			'The groups of the level below `query.path` of a grouped team table, with how many rows each holds, at most 1000; empty when the query groups no further. Who may ask is as for `dataTablePage`.',
		type: [DataTableGroup],
		args: tableArgs,
		resolve: async (_root, args, ctx) => {
			const access = await assertCanReadDataTable({
				ctx,
				table: args.table,
				conferenceId: args.conferenceId
			});
			return loadDataTableGroups({ ...args, access });
		}
	})
}));
