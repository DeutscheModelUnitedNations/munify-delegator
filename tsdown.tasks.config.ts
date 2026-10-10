import { defineConfig } from 'tsdown';
import { join } from 'node:path';
import packagejson from './package.json' with { type: 'json' };

const shims = join(import.meta.dirname, 'src', 'tasks', 'shims');

const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** A package and anything imported from inside it (`drizzle-orm/node-postgres`). */
const packages = (names: string[]) => new RegExp(`^(${names.map(escape).join('|')})(/|$)`);

/**
 * The background tasks, bundled into one file that runs as its own process (`Dockerfile.tasks`).
 * Nothing but the standalone `tasksMain.js` ships, so the packages it keeps external have to be
 * installed in that image.
 */
export default defineConfig({
	entry: { tasksMain: 'src/tasks/index.ts' },
	outDir: 'tasksOut',
	clean: true,
	format: 'esm',
	platform: 'node',
	target: 'node22',
	minify: true,
	// The image copies and runs `tasksMain.js`; without `"type": "module"` tsdown would write `.mjs`.
	outExtensions: () => ({ js: '.js' }),
	sourcemap: true,
	dts: false,
	// The tasks share `$api/**` with the app, which reaches for SvelteKit's virtual modules.
	// Nothing resolves them outside a SvelteKit build, so they point at plain-Node stand-ins.
	alias: {
		'$app/environment': join(shims, 'appEnvironment.ts'),
		'$env/dynamic/private': join(shims, 'envDynamicPrivate.ts')
	},
	deps: {
		neverBundle: packages([
			...Object.keys(packagejson.devDependencies),
			// Real runtime dependencies, installed in Dockerfile.tasks rather than bundled: `pg`
			// resolves its optional native bindings dynamically, which a bundle cannot carry.
			'drizzle-orm',
			'pg'
		]),
		// What is not external above is bundled on purpose; do not log it as a hint.
		onlyBundle: false
	}
});
