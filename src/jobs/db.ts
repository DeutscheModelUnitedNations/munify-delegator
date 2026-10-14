import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '$api/db/schema';
import { relations } from '$api/db/relations';

/**
 * The jobs' own database client. `$api/db/db` would do, but it reads the app's whole private
 * configuration (OIDC, secrets, SMTP) first, and a job should start with nothing but a
 * `DATABASE_URL`.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL is not set');
}

export const db = drizzle({ connection: { connectionString }, relations });
export { schema };
