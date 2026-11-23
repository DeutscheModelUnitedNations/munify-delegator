import { defineConfig } from 'tsdown';

/**
 * The worker threads the server starts for CPU-bound work, so neither the matching
 * (`#api/handlers/assignment/matching`) nor reading scans (`#api/handlers/postalScan/scanReader`)
 * blocks the event loop. SvelteKit's build does not bundle worker entry points, so
 * they are built on their own into the adapter's output directory. Run it after `vite build`: the
 * adapter empties `build/` first, and `clean` is off so this does not do the same to the app.
 *
 * What the workers need is bundled in or copied beside them, so the app image runs them from the
 * `build/` directory; only native code stays a runtime dependency.
 */
export default defineConfig({
	entry: {
		matching: 'src/api/handlers/assignment/matching.worker.ts',
		scanReader: 'src/api/handlers/postalScan/scanReader.worker.ts'
	},
	outDir: 'build/compute',
	format: 'esm',
	platform: 'node',
	target: 'node22',
	clean: false,
	dts: false,
	sourcemap: true,
	// Plain data in and out: nothing here may need SvelteKit's virtual modules.
	deps: {
		// native code
		neverBundle: ['@napi-rs/canvas'],
		alwaysBundle: [
			'munkres-algorithm',
			'js-aruco2',
			'ml-matrix',
			'cbor2',
			/^pdfjs-dist($|\/)/,
			/^zxing-wasm($|\/)/
		],
		onlyBundle: false
	},
	// what pdf.js and the code reader load while they run (`scanReader.worker.ts`)
	copy: [
		...['wasm', 'standard_fonts', 'cmaps'].map((folder) => ({
			from: `node_modules/pdfjs-dist/${folder}`,
			to: 'build/compute/scanReaderFiles'
		})),
		{
			from: 'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
			to: 'build/compute/scanReaderFiles'
		}
	]
});
