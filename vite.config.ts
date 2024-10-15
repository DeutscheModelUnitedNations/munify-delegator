import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

export default defineConfig({
	server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        '/prisma/generated/schema',
      ],
    },
  },
	plugins: [
		// enhancedImages(),
		paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit()
	]
});
