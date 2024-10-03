import adapter from 'svelte-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess({
		script: true
	}),

	vitePlugin: {
		dynamicCompileOptions({ filename }) {
			if (filename.includes('node_modules')) {
				return { runes: undefined }; // or false, check what works
			}
		}
	},

	compilerOptions: {
		runes: true
	},

	kit: {
		adapter: adapter({
			dynamic_origin: true
		}),
		alias: {
			$api: 'src/api',
			$assets: 'src/assets',
			$db: 'prisma',
			$config: 'src/config'
		}
	}
};

export default config;
