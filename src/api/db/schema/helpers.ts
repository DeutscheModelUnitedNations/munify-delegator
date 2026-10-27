import {
	snakeCase,
	text,
	timestamp,
	boolean,
	index,
	uniqueIndex,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from '../../../lib/helpers/nanoid';

export const defaultTimestamps = {
	createdAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp({ precision: 3 })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
		.$onUpdate(() => new Date())
};

/**
 * A trigram index backing rumble's `search` argument (`col % term`, ordered by `col <-> term`).
 * rumble ORs the match over every text column the reader may see, so the planner can only use
 * these when all of those columns are indexed - index the whole set a table is searched by.
 * The `pg_trgm` extension has to exist before the migration creates one.
 */
export function trigramIndex(name: string, column: AnyPgColumn) {
	return index(name).using('gin', sql`${column} gin_trgm_ops`);
}

export const defaultIdAndTimestamps = {
	id: text()
		.$defaultFn(() => nanoid())
		.primaryKey(),
	...defaultTimestamps
};

/** PaperVersion and PaperReview are append-only: id + createdAt, no updatedAt. */
export const defaultIdAndCreatedAt = {
	id: text()
		.$defaultFn(() => nanoid())
		.primaryKey(),
	createdAt: defaultTimestamps.createdAt
};

/**
 * Prisma's implicit many-to-many join table: columns `a` and `b` referencing the two sides
 * (cascading both ways unless `bOnDelete` says otherwise), unique on the pair and indexed on `b`.
 * The index names derive from the table name, as Prisma generated them.
 */
export function implicitManyToMany<TName extends string>(
	name: TName,
	a: () => AnyPgColumn,
	b: () => AnyPgColumn,
	{ bOnDelete = 'cascade' }: { bOnDelete?: 'cascade' | 'restrict' } = {}
) {
	return snakeCase.table(
		name,
		{
			id: text()
				.$defaultFn(() => nanoid())
				.primaryKey(),
			a: text().notNull().references(a, { onDelete: 'cascade', onUpdate: 'cascade' }),
			b: text().notNull().references(b, { onDelete: bOnDelete, onUpdate: 'cascade' })
		},
		(table) => [
			uniqueIndex(`${name}_ab_key`).using(
				'btree',
				table.a.asc().nullsLast(),
				table.b.asc().nullsLast()
			),
			index(`${name}_b_index`).using('btree', table.b.asc().nullsLast())
		]
	);
}
