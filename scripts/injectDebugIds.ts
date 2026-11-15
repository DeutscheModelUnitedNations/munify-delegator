/**
 * Gives every built script a debug id, the key Bugsink finds its sourcemap by:
 *
 *   bun scripts/injectDebugIds.ts [build]
 *
 * It runs in the image's build stage (`Dockerfile`), so the ids are in the files the app serves;
 * CI uploads the sourcemaps from the image afterwards (`.github/workflows/ci.yml`). Injected into a
 * copy after the image was built, they never reached the browser, and no stack trace resolved.
 *
 * adapter-node compressed the client's files before this (`precompress`), and the server answers
 * with the `.br` / `.gz` copy where the browser takes one: those are written again, from the
 * injected file, as SvelteKit writes them.
 */
import { spawnSync } from 'node:child_process';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const out = process.argv[2] ?? 'build';

const injected = spawnSync('node_modules/.bin/sentry-cli', ['sourcemaps', 'inject', out], {
	stdio: ['ignore', 'ignore', 'inherit']
});
if (injected.status !== 0) {
	console.error('sentry-cli could not inject the debug ids');
	process.exit(injected.status ?? 1);
}

const exists = (file: string) =>
	access(file).then(
		() => true,
		() => false
	);

let recompressed = 0;
let withId = 0;
for (const entry of await readdir(out, { recursive: true, withFileTypes: true })) {
	if (!entry.isFile() || !/\.(c|m)?js$/.test(entry.name)) continue;
	const file = join(entry.parentPath, entry.name);
	const contents = await readFile(file);
	if (contents.includes('//# debugId=')) withId++;
	if (!(await exists(`${file}.br`)) && !(await exists(`${file}.gz`))) continue;
	const [gz, br] = await Promise.all([
		gzip(contents, { level: zlib.constants.Z_BEST_COMPRESSION }),
		brotli(contents)
	]);
	await Promise.all([writeFile(`${file}.gz`, gz), writeFile(`${file}.br`, br)]);
	recompressed++;
}

if (withId === 0) {
	console.error(`No script in ${out} carries a debug id`);
	process.exit(1);
}
console.log(`${withId} scripts carry a debug id, ${recompressed} compressed again`);
