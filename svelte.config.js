import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from 'svelte-adapter-bun';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			dynamic_origin: true
		}),
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
