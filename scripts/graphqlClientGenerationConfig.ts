import { generate } from '@graphql-codegen/cli';
import { watch } from 'fs';

const run = async () => {
	console.info('Generating GraphQL Client...');
	let retried = 0;
	const interval = setInterval(async () => {
		try {
			retried++;
			await generate({
				generates: {
					'./src/lib/gqlClient/generated.ts': {
						plugins: ['typescript', 'typescript-operations', 'graphql-codegen-svelte-apollo']
					}
				},
				schema: 'http://localhost:5173/api/graphql',
				config: {
					clientPath: '@apollo/client'
				}
			});
			clearInterval(interval);
		} catch (error) {
			if (retried > 10) {
				clearInterval(interval);
				throw error;
			}
		}
	}, 1000);
};
await run();
console.info('Watching for changes to regenerate GraphQL Client...');
watch('./src/api', { recursive: true }, run);
