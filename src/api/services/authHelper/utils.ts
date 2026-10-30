/**
 * Plumbing for the rules: turning a filter into a rule, and reading, changing or deleting one row
 * only if the caller's ability on its table allows it. A row the caller may not touch and a row
 * that does not exist both answer NOT_FOUND, so a refusal never tells whether the row is there.
 */
import { db, schema, type Transaction } from '#api/db/db';
import { sql, type SQL } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { ApiContext } from '#api/rumble';
import type { Context } from '#api/context';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

/** The signed-in caller's user id; undefined when nobody is signed in. */
export function callerUserId(ctx: Context) {
	return ctx.oidc.user?.sub;
}

/**
 * Turns a filter into what `.when()` expects: the rule applies to the rows matching `filter`, and
 * to none when there is no filter (`isOwnUser` and friends return undefined for "nobody").
 */
export function grantWhere<W extends object>(filter: W | undefined) {
	return filter ? { where: filter } : undefined;
}

type RowAction = 'read' | 'update' | 'delete';

/** The tables whose rows have an `id` column, by the names their abilities go by. */
type TableWithId = {
	[K in keyof ApiContext['abilities']]: (typeof schema)[K] extends { id: unknown } ? K : never;
}[keyof ApiContext['abilities']];

type IdFilterable = {
	filter(action: RowAction): Promise<{
		merge(filter: { where: { id: string; RAW?: SQL } }): { sql: { where: SQL | undefined } };
	}>;
};

/**
 * A SQL `where` matching the row `id` of `table` only if the caller may `action` it, for writing
 * through: `.where(await whereAllowed(ctx, 'user', 'update', id))` touches nothing otherwise.
 * `extra` narrows it further (a role of one `kind`, a row of one conference).
 */
export async function whereAllowed<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	action: RowAction,
	id: string,
	extra?: SQL
) {
	const ability: IdFilterable = ctx.abilities[table];
	// drizzle throws on an `undefined` filter value, so `RAW` only goes in when there is one
	return (await ability.filter(action)).merge({ where: extra ? { id, RAW: extra } : { id } }).sql
		.where;
}

/**
 * Throws NOT_FOUND unless the caller may `action` the row `id` of `table`. For a check ahead of
 * other work; to just change or delete the row, use `updateIfAllowed` / `deleteIfAllowed`.
 *
 * Every helper here that queries takes a `tx` (default `db`), so it can run inside a transaction.
 */
export async function assertAllowed<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	action: RowAction,
	id: string,
	options: { extra?: SQL; message?: () => string; tx?: Transaction | typeof db } = {}
) {
	const [row] = await (options.tx ?? db)
		.select({ found: sql`1` })
		.from(schema[table])
		.where(await whereAllowed(ctx, table, action, id, options.extra))
		.limit(1);
	if (!row) {
		const message =
			options.message ??
			(action === 'update' ? m.updateNotFoundOrForbidden : m.deleteNotFoundOrForbidden);
		throw apiError('NOT_FOUND', message());
	}
}

/** Sets `values` on the row `id` of `table` if the caller may update it; NOT_FOUND otherwise. */
export async function updateIfAllowed<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	id: string,
	values: PgUpdateSetSource<(typeof schema)[K]>,
	tx: Transaction | typeof db = db
) {
	const updated = await tx
		.update(schema[table])
		.set(values)
		.where(await whereAllowed(ctx, table, 'update', id))
		.returning({ id: schema[table].id });
	if (updated.length === 0) {
		throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	}
}

/** Deletes the row `id` of `table` if the caller may delete it; NOT_FOUND otherwise. */
export async function deleteIfAllowed<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	id: string,
	options: { message?: () => string; tx?: Transaction | typeof db } = {}
) {
	const deleted = await (options.tx ?? db)
		.delete(schema[table])
		.where(await whereAllowed(ctx, table, 'delete', id))
		.returning({ id: schema[table].id });
	if (deleted.length === 0) {
		throw apiError('NOT_FOUND', (options.message ?? m.deleteNotFoundOrForbidden)());
	}
}

/**
 * The query that finds the row `id` only if the caller may `action` it (read by default), mostly
 * to return a row after writing it: `db.query.x.findFirst(query(await queryAllowed(ctx.abilities.x, id)))`.
 * It takes the ability rather than the table name because drizzle cannot type the relational query
 * of a table that is only known generically.
 */
export async function queryAllowed<S>(
	ability: {
		filter(
			action: RowAction
		): Promise<{ merge(filter: { where: { id: string } }): { query: { single: S } } }>;
	},
	id: string,
	action: RowAction = 'read'
) {
	return (await ability.filter(action)).merge({ where: { id } }).query.single;
}
