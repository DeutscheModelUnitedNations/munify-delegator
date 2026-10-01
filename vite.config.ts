import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { oidcMock } from 'oidc-mock/vite';

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			autoUploadSourceMaps: false // We upload manually via CI to Bugsink
		}),
		tailwindcss(),
		// The local OIDC provider (oidc-mock.yaml). Only runs under `vite dev` and `vite preview`;
		// it has to come before SvelteKit so it can answer the login page itself.
		oidcMock(),
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
			provider: 'v8'
		}
	}
});
