import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

export default defineConfig({
	plugins: [
		// enhancedImages(),
		paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit()
	]
});
