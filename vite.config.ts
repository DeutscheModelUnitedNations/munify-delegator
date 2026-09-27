import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			autoUploadSourceMaps: false // We upload manually via CI to Bugsink
		}),
		tailwindcss(),
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
	build: {
		sourcemap: true // Required for Bugsink error tracking
	},
	test: {
		environment: 'jsdom',
		coverage: {
			provider: 'v8'
		}
	}
});
