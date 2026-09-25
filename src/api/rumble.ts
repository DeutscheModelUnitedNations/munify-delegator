import { rumble } from '@m1212e/rumble';
import ValidationPlugin from '@pothos/plugin-validation';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import { dev } from '$app/environment';
import { db, schema } from './db/db';
import { context } from './context';
import { db as prismaDb } from '$db/db';
import { getDatamodel } from '../../prisma/pothos/generated';

// Tells the dev server to reload the schema builder's cache, so fields and queries from a
// previous build don't accumulate. Mirrors chase.
if (dev) {
	import('$api/handlers/register');
}

export const {
	abilityBuilder,
	schemaBuilder,
	whereArg,
	object,
	query,
	createYoga,
	enum_,
	clientCreator
} = rumble({
	db,
	schema,
	context,
	defaultLimit: 1000,
	// `impersonate` is delegator-specific: the CASL layer modelled it as an action on User and
	// the management UI depends on it. Chase has no equivalent, so there is no pattern to copy.
	actions: ['read', 'update', 'delete', 'impersonate'],
	pothosConfig: {
		// SimpleObjects backs the ad-hoc result types a few mutations return (invitation batches,
		// review results). Rumble does not load it by default.
		plugins: [ValidationPlugin, SimpleObjectsPlugin],
		// Type-only, mirror image of the `drizzle` key in resolvers/builder.ts: the legacy
		// @pothos/plugin-prisma marks `prisma` required on every builder. Inert - not in
		// `plugins` - and removed once the legacy stack is gone.
		prisma: { client: prismaDb, dmmf: getDatamodel() }
	}
});
