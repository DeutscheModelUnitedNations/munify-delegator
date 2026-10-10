import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Components fetch through `client.liveQuery`, which is awaited at the top level of
		// `<script>`. Svelte only allows that in async mode.
		experimental: {
			async: true
		}
	},
	kit: {
		// Remote functions are how the urql client reaches the GraphQL schema during SSR: a
		// relative endpoint URL cannot be fetched from Node, so server-side operations execute
		// the schema in-process instead. See src/api/graphql.remote.ts.
		experimental: {
			remoteFunctions: true,
			// OpenTelemetry: `src/instrumentation.server.ts` sets up the exporter before the app
			// loads, and SvelteKit emits spans for handle, loads and remote functions into it. Both
			// are inert unless OTEL_ENDPOINT_URL is set.
			instrumentation: { server: true },
			tracing: { server: true }
		},
		adapter: adapter(),
		alias: {
			$api: 'src/api',
			$assets: 'src/assets',
			$config: 'src/lib/config'
		}
	}
};

export default config;
