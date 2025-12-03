import { sveltekit } from '@sveltejs/kit/vite';
import houdini from 'houdini/vite';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vitest/config';

const vitestConfig: UserConfig['test'] = {
	environment: 'jsdom',
	coverage: {
		provider: 'v8'
	}
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		houdini(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		})
	],
	test: vitestConfig
});
