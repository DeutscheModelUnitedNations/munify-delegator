/**
 * Rewrites the `users` of oidc-mock.yaml from the dev accounts the seed creates
 * (`bun run dev:accounts`). oidc-mock re-reads the file on every request, so no restart is needed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { withGeneratedUsers } from '../src/api/db/seed-data/oidcMockUsers';

const file = fileURLToPath(new URL('../oidc-mock.yaml', import.meta.url));
const before = readFileSync(file, 'utf8');
const after = withGeneratedUsers(before);

if (after === before) {
	console.info('oidc-mock.yaml is up to date.');
} else {
	writeFileSync(file, after);
	console.info('Wrote the dev accounts to oidc-mock.yaml.');
}
