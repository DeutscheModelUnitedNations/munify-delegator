import { drizzle } from 'drizzle-orm/node-postgres';
import * as schemaInternal from './schema';
import { relations } from './relations';
import { configPrivate } from '$config/private';
import { building } from '$app/environment';

const conf = {
	relations,
	jit: true
} as const;

export const db = building ? drizzle.mock(conf) : drizzle(configPrivate.DATABASE_URL, conf);

export const schema = schemaInternal;

/** The handle a `db.transaction` callback receives, for helpers that run inside one. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
