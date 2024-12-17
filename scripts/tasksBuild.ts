import { build } from 'tsup';
import { join } from 'node:path';
import { rm, mkdir, stat } from 'node:fs/promises';
import packagejson from '../package.json';

const rootDir = join(import.meta.dirname, '..');
const outDir = join(rootDir, 'tasksOut');
const entrypoint = join(rootDir, 'src', 'tasks', 'index.ts');
const tsconfig = join(rootDir, 'tsconfig.json');

const OPTIONS: Parameters<typeof build>[0] = {
	entry: {
		tasksMain: entrypoint
	},
	format: ['esm'],
	target: 'node22',
	outDir,
	globalName: 'tasks',
	minify: true,
	sourcemap: true,
	treeshake: true,
	bundle: true,
	splitting: true,
	tsconfig,
	external: [
		// ...Object.keys(packagejson.dependencies),
		// ...Object.keys(packagejson.peerDependencies),
		...Object.keys(packagejson.devDependencies)
	]
};

console.info('Starting build tasks...');

console.info(
	'Building with following paths:',
	JSON.stringify({ clientDir: outDir, main: entrypoint })
);

try {
	if (await stat(outDir)) {
		console.info('Cleaning outDir...');
		await rm(outDir, { recursive: true });
		console.info('Cleaned outDir!');
	}
	// eslint-disable-next-line no-empty, @typescript-eslint/no-unused-vars
} catch (e) {}

console.info('Creating outDir...');
await mkdir(outDir, { recursive: true });
console.info('Created outDir!');

console.info('Building tasks...');
await build(OPTIONS);
console.info('Built tasks!');
console.info('Done!');
process.exit(0);
