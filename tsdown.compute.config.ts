import { defineConfig } from 'tsdown';

/**
 * The worker threads the server starts for CPU-bound work, so the matching does not block the
 * event loop (`$api/services/matching`). SvelteKit's build does not bundle worker entry points, so
 * they are built on their own into the adapter's output directory. Run it after `vite build`: the
 * adapter empties `build/` first, and `clean` is off so this does not do the same to the app.
 *
 * Everything the worker needs is bundled in, which is what lets the app image run it without
 * anything beyond the `build/` directory.
 */
export default defineConfig({
	entry: { matching: 'src/lib/assignment/matching.worker.ts' },
	outDir: 'build/compute',
	format: 'esm',
	platform: 'node',
	target: 'node22',
	clean: false,
	dts: false,
	sourcemap: true,
	// Plain data in and out: nothing here may need SvelteKit's virtual modules.
	deps: { onlyBundle: ['munkres-algorithm'] }
});
