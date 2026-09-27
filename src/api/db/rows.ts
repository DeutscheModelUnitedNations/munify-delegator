import type * as schema from './schema';

/** A row as the database returns it, for code that only needs the shape of one. */
export type Row<T extends keyof typeof schema> = (typeof schema)[T] extends {
	$inferSelect: infer S;
}
	? S
	: never;

/** What a row needs to be inserted: defaults and generated columns are optional. */
export type Insert<T extends keyof typeof schema> = (typeof schema)[T] extends {
	$inferInsert: infer I;
}
	? I
	: never;
