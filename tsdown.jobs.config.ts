import { defineConfig, type TsdownPlugin } from 'tsdown';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, compileModule } from 'svelte/compiler';
import ts from 'typescript';
import { paraglideRolldownPlugin } from '@inlang/paraglide-js';

/**
 * The one-shot jobs CLI (`src/jobs/cli.ts`), bundled into a single file that runs as its own
 * short-lived process (`Dockerfile.jobs`). Everything is bundled but `pg`, which resolves its
 * optional native bindings dynamically and is installed in the image instead.
 *
 * The jobs call the app's services directly (`send-emails` sends through the email handler), so the
 * bundle builds what Vite builds for them: the mail templates (Svelte components, rendered on the
 * server), the corporate identity's CSS (`?raw`), Paraglide's messages, and SvelteKit's
 * `$app/env` modules, which read the same variables from `process.env`.
 */

const appEnvSource = fileURLToPath(new URL('./src/jobs/appEnv.ts', import.meta.url));

/** The variables `src/env.ts` declares, public ones (`PUBLIC_…`) or the others. */
function declaredVariables({ isPublic }: { isPublic: boolean }) {
	const source = readFileSync(new URL('./src/env.ts', import.meta.url), 'utf8');
	return [...source.matchAll(/^\t([A-Z][A-Z0-9_]*): \{/gm)]
		.map(([, name]) => name)
		.filter((name) => name.startsWith('PUBLIC_') === isPublic);
}

/**
 * `$app/env/private` and `$app/env/public` as modules exporting each variable, validated by its
 * schema in `src/env.ts` (`readAppVariable`). The reads are pure, so the bundle keeps only those a
 * job imports, and a job needs only the variables it uses.
 */
function envModule({ isPublic }: { isPublic: boolean }) {
	return [
		`import { readAppVariable } from ${JSON.stringify(appEnvSource)};`,
		...declaredVariables({ isPublic }).map(
			(name) => `export const ${name} = /* @__PURE__ */ readAppVariable(${JSON.stringify(name)});`
		)
	].join('\n');
}

const appEnvPlugin: TsdownPlugin = {
	name: 'app-env',
	resolveId(id) {
		if (id === '$app/env' || id === '$app/env/private' || id === '$app/env/public')
			return `\0${id}`;
		return null;
	},
	load(id) {
		if (id === '\0$app/env') return 'export const building = false;\nexport const dev = false;';
		if (id === '\0$app/env/private') return envModule({ isPublic: false });
		if (id === '\0$app/env/public') return envModule({ isPublic: true });
		return null;
	}
};

/** Svelte components compiled for the server, as `render` from `svelte/server` expects them. */
const sveltePlugin: TsdownPlugin = {
	name: 'svelte',
	load: {
		filter: { id: /\.svelte$/ },
		handler(id) {
			const { js } = compile(readFileSync(id, 'utf8'), {
				filename: id,
				generate: 'server',
				css: 'injected'
			});
			return { code: js.code, map: js.map, moduleType: 'js' };
		}
	},
	// runes modules (`….svelte.ts`), whose `$state` and `$derived` are the compiler's to replace;
	// it reads no TypeScript, so the types go first
	transform: {
		filter: { id: /\.svelte\.[jt]s$/ },
		handler(code, id) {
			const { outputText } = ts.transpileModule(code, {
				fileName: id,
				compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }
			});
			const { js } = compileModule(outputText, { filename: id, generate: 'server' });
			return { code: js.code, map: js.map, moduleType: 'js' };
		}
	}
};

/** `?raw` imports, as Vite answers them: the file's text as the default export. */
const rawPlugin: TsdownPlugin = {
	name: 'raw',
	resolveId: {
		filter: { id: /\?raw$/ },
		async handler(id, importer) {
			const resolved = await this.resolve(id.slice(0, -'?raw'.length), importer, {
				skipSelf: true
			});
			return resolved ? `${resolved.id}?raw` : null;
		}
	},
	load: {
		filter: { id: /\?raw$/ },
		handler(id) {
			const text = readFileSync(id.slice(0, -'?raw'.length), 'utf8');
			return { code: `export default ${JSON.stringify(text)};`, moduleType: 'js' };
		}
	}
};

export default defineConfig({
	entry: { cli: 'src/jobs/cli.ts' },
	outDir: 'jobsOut',
	clean: true,
	format: 'esm',
	platform: 'node',
	target: 'node22',
	outExtensions: () => ({ js: '.js' }),
	sourcemap: true,
	dts: false,
	deps: {
		neverBundle: ['pg'],
		alwaysBundle: [/^(?!pg($|\/))/],
		onlyBundle: false
	},
	plugins: [
		// the same options as in `vite.config.ts`
		paraglideRolldownPlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		}),
		appEnvPlugin,
		sveltePlugin,
		rawPlugin
	]
});
