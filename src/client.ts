import { HoudiniClient } from '$houdini';
import { error } from '@sveltejs/kit';
import toast from 'svelte-french-toast';

export default new HoudiniClient({
	url: '/api/graphql',
	throwOnError: {
		operations: ['mutation', 'subscription'],
		error: (errors, ctx) => {
			const err = errors.at(0);
			if (err) {
				toast.error(err.message, { position: 'bottom-right' });
				error(500, errors.map((err) => err.message).join('. ') + ` (${ctx.artifact.name})`);
			} else {
				toast.error('Something went wrong');
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
