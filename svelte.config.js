import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$api: 'src/api',
			$assets: 'src/assets',
			$db: 'prisma',
			$config: 'src/config',
			$houdini: './$houdini'
		}
	}
};

export default config;
