import { plugin } from 'bun';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves the `#lib/…`, `#api/…` and `#assets/…` subpath imports for code Bun runs directly - the
 * dev seed, the reset, the scripts. The app's modules import with the file extension the build
 * emits (`#lib/helpers/countryCodes.js`), which Vite, TypeScript and tsdown map onto the `.ts`
 * source; Bun only does that for relative imports, so this preload (`bunfig.toml`) does it for
 * the patterns in `package.json`'s `imports`.
 */

const root = join(import.meta.dir, '..');
const imports: Record<string, string> = JSON.parse(
	readFileSync(join(root, 'package.json'), 'utf8')
).imports;

/** `#lib/` → `src/lib/`, from every `"#x/*": "./dir/*"` entry. */
const prefixes = Object.entries(imports).flatMap(([pattern, target]) =>
	pattern.endsWith('/*') && target.endsWith('/*')
		? [{ prefix: pattern.slice(0, -1), dir: join(root, target.slice(0, -1)) }]
		: []
);

plugin({
	name: 'subpath-imports-to-source',
	setup(build) {
		build.onResolve({ filter: /^#/ }, (args) => {
			const match = prefixes.find(({ prefix }) => args.path.startsWith(prefix));
			if (!match) return undefined;
			const file = join(match.dir, args.path.slice(match.prefix.length));
			if (existsSync(file)) return { path: file };
			const source = file.replace(/\.js$/, '.ts');
			return existsSync(source) ? { path: source } : undefined;
		});
	}
});
