import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '#api/db/schema/index.js';
import { relations } from '#api/db/relations.js';
import { databaseConfig } from './config';

/**
 * The jobs' own database client. `#api/db/db.js` would do, but it reads the app's whole private
 * configuration (OIDC, secrets, SMTP) first, and a job should start with nothing but a
 * `DATABASE_URL`.
 */
const { DATABASE_URL: connectionString } = databaseConfig();

export const db = drizzle({ connection: { connectionString }, relations });
export { schema };
