import { defineConfig } from 'tsdown';

/**
 * The one-shot jobs CLI (`src/jobs/cli.ts`), bundled into a single file that runs as its own
 * short-lived process (`Dockerfile.jobs`). Everything is bundled but `pg`, which resolves its
 * optional native bindings dynamically and is installed in the image instead.
 */
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
	}
});
