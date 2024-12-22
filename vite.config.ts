import { sveltekit } from '@sveltejs/kit/vite';
import houdini from 'houdini/vite';
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';

export default defineConfig({
	plugins: [
		houdini(),
		paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit()
	]
});
