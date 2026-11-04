import { drizzle } from 'drizzle-orm/node-postgres';
import * as schemaInternal from './schema';
import { relations } from './relations';
import { DATABASE_POOL_SIZE, DATABASE_URL } from '$app/env/private';
import { building } from '$app/env';
import { listenForPoolErrors } from './poolErrors';
import { closeOnShutdown } from '#api/services/shutdown';

const conf = {
	relations,
	jit: true
} as const;

// Postgres' own JIT is off for the app's connections. rumble's ability filters and per-row column
// masks make statements that postgres costs far above `jit_above_cost`, so it compiled each one to
// machine code before running it: a delegation's card took 6.7 s, of which 6.3 s was compiling and
// 0.4 s running. None of these statements runs long enough to win that back.
export const db = building ? drizzle.mock(conf) : connect();

function connect() {
	const connected = drizzle({
		// More than a handful: under load every request waits for a free connection, and the
		// ability-filtered statements hold one for a while.
		connection: {
			connectionString: DATABASE_URL,
			options: '-c jit=off',
			max: DATABASE_POOL_SIZE
		},
		...conf
	});
	listenForPoolErrors(connected.$client);
	closeOnShutdown(() => connected.$client.end());
	return connected;
}

export const schema = schemaInternal;

/** The handle a `db.transaction` callback receives, for helpers that run inside one. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
