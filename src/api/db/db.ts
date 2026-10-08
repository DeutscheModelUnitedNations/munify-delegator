import { drizzle } from 'drizzle-orm/node-postgres';
import * as schemaInternal from './schema';
import { relations } from './relations';
import { configPrivate } from '$config/private';
import { building } from '$app/environment';

const conf = {
	relations,
	jit: true
} as const;

// Postgres' own JIT is off for the app's connections. rumble's ability filters and per-row column
// masks make statements that postgres costs far above `jit_above_cost`, so it compiled each one to
// machine code before running it: a delegation's card took 6.7 s, of which 6.3 s was compiling and
// 0.4 s running. None of these statements runs long enough to win that back.
export const db = building
	? drizzle.mock(conf)
	: drizzle({
			connection: { connectionString: configPrivate.DATABASE_URL, options: '-c jit=off' },
			...conf
		});

export const schema = schemaInternal;

/** The handle a `db.transaction` callback receives, for helpers that run inside one. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
