import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { jsonDocument } from '#api/services/argSchemas';
import { todayKey } from '#lib/dataGrid/dateConditions';
import { dataQuerySchema, type DataQuery } from '#lib/dataGrid/stateSchema';
import { DATA_TABLE_KEYS, type DataTableKey } from '#lib/dataGrid/tableKeys';
import { m } from '#lib/paraglide/messages';
import type { DataTableAccess } from './source';
import { DATA_TABLE_SOURCES } from './sources/index';
import {
	countStatement,
	groupsStatement,
	pageStatement,
	type StatementInput
} from './sql/statements';

/** The most rows one page holds. */
const MAX_PAGE_SIZE = 1000;

export const dataTableArgSchemas = {
	table: z.enum(DATA_TABLE_KEYS, { error: () => m.dataTableUnknown() }),
	query: jsonDocument({
		schema: dataQuerySchema,
		malformed: () => m.dataTableQueryMalformed(),
		invalid: (details) => m.dataTableQueryInvalid({ details })
	}),
	limit: z
		.int()
		.min(1, { error: () => m.pageLimitRange({ max: MAX_PAGE_SIZE }) })
		.max(MAX_PAGE_SIZE, { error: () => m.pageLimitRange({ max: MAX_PAGE_SIZE }) }),
	offset: z.int().min(0, { error: () => m.pageOffsetNegative() }),
	search: z
		.string()
		.max(200, { error: () => m.dataTableSearchTooLong() })
		.nullish()
};

interface LoadArgs {
	table: DataTableKey;
	conferenceId: string;
	access: DataTableAccess;
	query: DataQuery;
	search?: string | null;
}

function statementInput(args: LoadArgs): StatementInput {
	if (args.query.path.length > args.query.grouping.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.dataTableGroupPathTooDeep() });
	}
	return {
		source: DATA_TABLE_SOURCES[args.table],
		conferenceId: args.conferenceId,
		access: args.access,
		query: args.query,
		search: args.search ?? '',
		today: todayKey()
	};
}

const pageRows = z.array(z.object({ id: z.string() }));
const totalRows = z.array(z.object({ total: z.number() }));

/**
 * One page of a table, in the table's order, within the group the query names: the row ids,
 * whether another page follows, how many rows match in all, and - for a table that exposes them -
 * the rows' column values.
 */
export async function loadDataTablePage(args: LoadArgs & { limit: number; offset: number }) {
	const input = statementInput(args);
	const [page, count] = await Promise.all([
		db.execute(pageStatement({ input, limit: args.limit, offset: args.offset }), 'objects'),
		db.execute(countStatement(input), 'objects')
	]);
	const ids = pageRows.parse(page).map((row) => row.id);
	const pageIds = ids.slice(0, args.limit);
	return {
		ids: pageIds,
		hasMore: ids.length > args.limit,
		total: totalRows.parse(count)[0]?.total ?? 0,
		values: input.source.exposeValues ? await valuesOf({ input, ids: pageIds }) : null
	};
}

/** The column values of the rows `ids`, in that order. */
async function valuesOf({ input, ids }: { input: StatementInput; ids: string[] }) {
	if (ids.length === 0) return [];
	const result = await db.execute(
		sql`select to_jsonb(t) as value from (${input.source.rows({
			conferenceId: input.conferenceId,
			access: input.access,
			uses: new Set()
		})}) as t where t.id = any(${sql.param(ids)}::text[])`,
		'objects'
	);
	const byId = new Map(
		z
			.array(z.object({ value: z.looseObject({ id: z.string() }) }))
			.parse(result)
			.map(({ value }) => [value.id, value])
	);
	return ids.flatMap((id) => byId.get(id) ?? []);
}

const groupRows = z.array(z.object({ value: z.string().nullable(), count: z.number() }));

/** The groups of the level below the query's path, each with how many rows it holds. */
export async function loadDataTableGroups(args: LoadArgs) {
	const input = statementInput(args);
	const statement = groupsStatement(input);
	if (!statement) return [];
	return groupRows.parse(await db.execute(statement, 'objects'));
}
