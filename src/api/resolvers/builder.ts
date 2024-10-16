import { dev } from '$app/environment';
import SchemaBuilder from '@pothos/core';

export const schemabuilder = new SchemaBuilder({});

// this tells the dev server to reload the cache of the schema builder to prevent buildup of non
// existent fields/queries
if (dev) {
	import('./api');
}
