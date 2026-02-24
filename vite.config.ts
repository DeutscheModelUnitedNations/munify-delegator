import { sveltekit } from '@sveltejs/kit/vite';
import houdini from 'houdini/vite';
import { defineConfig } from 'vitest/config';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';

function devAutoRestart() {
	const RACE_CONDITION_PATTERNS = [
		'has not been implemented', // Pothos ObjectRef race condition
		'Class extends value undefined is not a constructor or null' // Houdini store race condition
	];

	return {
		name: 'dev-auto-restart',
		configureServer(server) {
			let restarting = false;

			const triggerRestart = (label) => {
				if (restarting) return;
				restarting = true;
				console.warn(`\n⚠️  ${label}, restarting dev server...\n`);
				server.restart();
			};

			const isRaceCondition = (message) =>
				RACE_CONDITION_PATTERNS.some((pattern) => message?.includes(pattern));

			const onUnhandledRejection = (reason) => {
				if (reason instanceof Error && isRaceCondition(reason.message)) {
					triggerRestart('Race condition detected');
				}
			};

			process.on('unhandledRejection', onUnhandledRejection);
			server.httpServer?.on('close', () => {
				process.off('unhandledRejection', onUnhandledRejection);
			});

			const originalSsrFixStacktrace = server.ssrFixStacktrace;
			server.ssrFixStacktrace = function (e) {
				originalSsrFixStacktrace.call(this, e);
				if (isRaceCondition(e?.message)) {
					triggerRestart('SSR race condition detected');
				}
			};
		}
	};
}

export default defineConfig({
	plugins: [
		devAutoRestart(),
		sentrySvelteKit({
			autoUploadSourceMaps: false // We upload manually via CI to Bugsink
		}),
		tailwindcss(),
		houdini(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		})
	],
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
