import type * as schema from '../schema';

/** The shape a row needs to be inserted, which is what every factory in this folder returns. */
export type Insert<T extends keyof typeof schema> = (typeof schema)[T] extends {
	$inferInsert: infer I;
}
	? I
	: never;
