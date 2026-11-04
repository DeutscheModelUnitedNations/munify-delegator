/**
 * Regenerates the manual's screenshots in static/docs-assets/screenshots.
 *
 *   bun run docs:screenshots            all shots
 *   bun run docs:screenshots team/      only ids starting with "team/"
 *
 * Uses its own database (DOCS_DATABASE_URL, default `delegator_docs` next to the dev database),
 * which is migrated and filled with the dev seed on every run, and starts its own dev server
 * against it. The bucket is the dev one (`bun run dev:docker`). Stop your own dev server first:
 * both need the ports 5173 and 8090 (the mock OIDC provider).
 */
import { spawn } from 'node:child_process';
import { portInUse, waitForServer } from '@deutschemodelunitednations/docs-kit/capture';
import pg from 'pg';

const DATABASE_URL =
	process.env.DOCS_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/delegator_docs';
const BASE_URL = 'http://localhost:5173';
const filter = process.argv[2];
// Everything below must hit the docs database, never the dev database from .env
const env = { ...process.env, DATABASE_URL };
const { capture } = await import('./capture');

async function ensureDatabase() {
	const url = new URL(DATABASE_URL);
	const name = url.pathname.slice(1);
	url.pathname = '/postgres';
	const client = new pg.Client({ connectionString: url.href });
	await client.connect();
	const exists = await client.query('select 1 from pg_database where datname = $1', [name]);
	if (exists.rowCount === 0) await client.query(`create database "${name}"`);
	await client.end();
}

function run(cmd: string[]) {
	return new Promise<void>((resolve, reject) => {
		const proc = spawn(cmd[0], cmd.slice(1), { env, stdio: 'inherit' });
		proc.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`${cmd.join(' ')} failed`))
		);
	});
}

if ((await portInUse(5173)) || (await portInUse(8090))) {
	console.error('Port 5173 or 8090 is in use. Stop your dev server and run again.');
	process.exit(1);
}

await ensureDatabase();
await run(['bun', 'run', 'db:migrate']);
if (!process.env.DOCS_SKIP_SEED) await run(['bun', 'run', 'db:seed:dev']);

// The dev server's own output would drown the progress lines
const server = spawn('bunx', ['vite', 'dev', '--port', '5173', '--strictPort'], {
	env,
	stdio: 'ignore'
});
let failures: string[];
try {
	await waitForServer({ url: BASE_URL, isAlive: () => server.exitCode === null });
	// The first visits compile the routes; done here, they do not run into a shot's timeouts
	for (const path of ['/login', '/dashboard', '/docs']) await fetch(`${BASE_URL}${path}`);
	failures = await capture({ baseUrl: BASE_URL, filter });
} finally {
	server.kill();
}

if (failures.length) {
	console.error(`\n${failures.length} screenshot(s) failed:\n${failures.join('\n')}`);
	process.exit(1);
}
process.exit(0);
