import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import { oidcMock } from 'oidc-mock/vite';
import { fileURLToPath } from 'node:url';
import type { EnvironmentModuleNode, Plugin } from 'vite';
import mkcert from 'vite-plugin-mkcert';

/** Whether `file` is one of the modules, or imports one of them, directly or transitively. */
function reachesFile(modules: EnvironmentModuleNode[], file: string) {
	const seen = new Set<EnvironmentModuleNode>();
	const queue = [...modules];
	for (let mod = queue.pop(); mod; mod = queue.pop()) {
		if (seen.has(mod)) continue;
		seen.add(mod);
		if (mod.file === file) return true;
		queue.push(...mod.importers);
	}
	return false;
}

/**
 * Rebuilds the rumble instance whenever a module that feeds the GraphQL schema changes in dev.
 *
 * The handlers register their abilities, objects and fields on the singleton `src/api/rumble.ts`
 * creates, once, at module init. Re-running only an edited handler would register it a second
 * time on a builder that has already been built, which rumble rejects. So when a change reaches
 * `src/api/handlers/register.ts` through its importers, `src/api/rumble.ts` is invalidated with it:
 * every importer of rumble (all handlers, `register.ts`, `yoga.ts`) then re-runs against a fresh
 * builder. rumble.ts used to get this by importing `register.ts` itself in dev, which made every
 * handler part of an import cycle.
 */
function rebuildRumbleOnSchemaChange(): Plugin {
	const rumbleFile = fileURLToPath(new URL('./src/api/rumble.ts', import.meta.url));
	const registerFile = fileURLToPath(new URL('./src/api/handlers/register.ts', import.meta.url));

	return {
		name: 'rebuild-rumble-on-schema-change',
		apply: 'serve',
		hotUpdate({ modules }) {
			if (!reachesFile(modules, registerFile)) return;
			const rumble = this.environment.moduleGraph.getModulesByFile(rumbleFile);
			return rumble ? [...modules, ...rumble] : undefined;
		}
	};
}

// Serve `vite dev` over HTTPS with a locally trusted mkcert certificate. Off for the e2e suite
// (playwright.config.ts sets DEV_HTTPS=false), which runs on plain HTTP, and outside the Vite CLI:
// vitest and svelte-check (which preprocesses styles through this config) load it too, and the
// plugin fetches the mkcert binary as soon as it is configured.
const runByViteCli = process.argv.some((arg) =>
	/[\\/](\.bin[\\/]vite|vite[\\/]bin[\\/]vite\.js)$/.test(arg)
);
const devHttps =
	runByViteCli &&
	!process.argv.includes('build') &&
	!process.env.VITEST &&
	process.env.DEV_HTTPS !== 'false';

export default defineConfig({
	plugins: [
		devHttps && mkcert(),
		sentrySvelteKit({
			autoUploadSourceMaps: false, // We upload manually via CI to Bugsink
			// Tracing is off (Bugsink only takes errors), so the build-time tracing instrumentation has
			// nothing to report. It also inlines the instrumented packages, graphql among them, into
			// the server bundle, where rumble's schema and its client generator then disagree about
			// which graphql they hold and the build fails.
			buildTimeInstrumentation: false
		}),
		tailwindcss(),
		// The local OIDC provider (oidc-mock.yaml). Only runs under `vite dev` and `vite preview`;
		// it has to come before SvelteKit so it can answer the login page itself.
		oidcMock(),
		rebuildRumbleOnSchemaChange(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		})
	],
	optimizeDeps: {
		// This is a Svelte 5 library whose store lives in a `.svelte.js` runes
		// module. esbuild's dependency pre-bundling can't compile `$state`, which
		// drops exports like `createNativeStore`. Excluding it routes the package
		// through vite-plugin-svelte's compiler instead.
		exclude: ['@deutschemodelunitednations/munify-resolution-editor']
	},
	ssr: {
		// The OIDC library needs typebox >= 1.1, but the hoisted copy is the 1.0 one that
		// sveltekit-superforms pins (and superforms breaks on 1.3). Bundling both into the server
		// build resolves the import from inside the library, where its own 1.3 copy lives, while
		// superforms keeps the hoisted one it expects.
		noExternal: ['@m1212e/sveltekit-oidc', 'typebox']
	},
	build: {
		sourcemap: true // Required for Bugsink error tracking
	},
	test: {
		environment: 'jsdom',
		// Unit tests live in src/. Without this, vitest's default glob also matches the Playwright
		// specs under e2e/, which cannot run outside the Playwright runner (`bun run test:e2e`).
		include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
		coverage: {
			provider: 'v8',
			// Its own directory: vitest empties it on every run, and coverage/ also holds the e2e
			// reports scripts/mergeCoverage.ts combines with this one.
			reportsDirectory: 'coverage/unit',
			// Generated code; scripts/coverageScope.ts leaves the same out of the e2e reports
			exclude: ['src/lib/paraglide/**', 'src/lib/api/rumbleClient/**'],
			reporter: ['text-summary', 'html', 'json']
		}
	}
});
