import { HoudiniClient } from '$houdini';
import { error } from '@sveltejs/kit';
import { toast } from '@zerodevx/svelte-toast';

export default new HoudiniClient({
	url: '/api/graphql',
	throwOnError: {
		operations: ['mutation', 'subscription'],
		error: (errors, ctx) => {
			const err = errors.at(0);
			if (err) {
				toast.push(err.message);
				error(500, errors.map((err) => err.message).join('. ') + ` (${ctx.artifact.name})`);
			} else {
				toast.push('Something went wrong');
				error(500, 'Something went wrong');
			}
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
