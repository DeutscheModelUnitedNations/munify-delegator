import { sveltekit } from '@sveltejs/kit/vite';
import houdini from 'houdini/vite';
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';

export default defineConfig({
	optimizeDeps: {
		exclude: ['chunk-LDTYDLR3.js?v=b698017b'] // TODO why is this needed!?
	},
	plugins: [
		houdini(),
		paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit()
	]
});
