import { sql, type SQL } from 'drizzle-orm';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';

/**
 * A table the backend searches, filters, sorts and groups. A source says what one row is - a
 * `select` with an `id` and one output column per column id - and the engine (`sql/`) does the rest
 * against it, under the alias `t`. What a caller may not see never leaves the source: a column the
 * caller may not read yields `null` for them, so filtering, sorting or grouping by it reveals
 * nothing (`DataTableAccess`).
 *
 * Column values have the SQL type of their column type: `text` for text and enums, a number for
 * numbers, `date` or a timestamp for dates (a timestamp sorts by the moment and filters and groups by
 * its day), `boolean`, and `text[]` for multi-enums.
 */

/** What the caller may read in a table, as its permissions file works it out. */
export interface DataTableAccess {
	/** Whether the caller reads the team members' private profile fields (team admins) */
	teamDetails: boolean;
}

export interface SourceArgs {
	conferenceId: string;
	access: DataTableAccess;
	/** The columns the query filters, sorts or groups by: a source may skip costly joins for others */
	uses: ReadonlySet<string>;
}

export interface DataTableSource {
	key: DataTableKey;
	columns: readonly ColumnMeta[];
	/** The rows: a `select` naming `id` and every column by its id */
	rows: (args: SourceArgs) => SQL;
	/** The condition the free-text search adds for a term that is not empty */
	search: (term: string) => SQL;
	/** The columns breaking ties after the sorting; `id` always comes last */
	tieBreak: readonly { id: string; desc: boolean }[];
	/**
	 * Whether a page answers the rows' column values too, for a table that has no other query to
	 * read its rows by id. Only for values the caller may see anyway: they are what filters see.
	 */
	exposeValues?: boolean;
}

/** A column of the source's rows, under the engine's alias. */
export function col(id: string) {
	return sql`t.${sql.identifier(id)}`;
}

/** Escapes what `like` gives a meaning to, so text is matched literally. */
export function escapeLike(text: string) {
	return text.replace(/[\\%_]/g, '\\$&');
}

/** `%text%` for `ilike`. */
function containing(text: string) {
	return `%${escapeLike(text)}%`;
}

/** Every word of the search has to occur in one of the expressions, any of them. */
export function wordsIn({ term, exprs }: { term: string; exprs: readonly SQL[] }) {
	const words = term.trim().split(/\s+/).filter(Boolean);
	const haystack = sql`concat_ws(' ', ${sql.join([...exprs], sql`, `)})`;
	return sql.join(
		words.map((word) => sql`${haystack} ilike ${containing(word)}`),
		sql` and `
	);
}
