import { HoudiniClient } from '$houdini';
import { error } from '@sveltejs/kit';
import { toast } from '@zerodevx/svelte-toast';

export default new HoudiniClient({
	url: 'http://localhost:5173/api/graphql',
	throwOnError: {
		operations: ['mutation', 'subscription'],
		error: (errors, ctx) => {
			toast.push(errors.at(0).message);
			error(500, errors.map((err) => err.message).join('. ') + ` (${ctx.artifact.name})`);
		}
	},

	// uncomment this to configure the network call (for things like authentication)
	// for more information, please visit here: https://www.houdinigraphql.com/guides/authentication
	fetchParams() {
		return {
			// headers: {
			//     Authentication: `Bearer ${session.token}`,
			// }
			credentials: 'include'
		};
	}
});
