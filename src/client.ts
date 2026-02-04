import { HoudiniClient } from '$houdini';
import { error, redirect } from '@sveltejs/kit';
import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';
import { browser } from '$app/environment';

interface EmailConflictExtensions {
	code: 'EMAIL_CONFLICT';
	isNewUser: boolean;
	maskedConflictingEmail: string;
	maskedExistingEmail?: string;
	refId: string;
}

// Validate and extract email conflict extensions with proper runtime checks
function getEmailConflictExtensions(
	errors: readonly { message: string; extensions?: Record<string, unknown> }[]
): EmailConflictExtensions | null {
	for (const err of errors) {
		const ext = err.extensions;
		if (
			ext &&
			ext.code === 'EMAIL_CONFLICT' &&
			typeof ext.isNewUser === 'boolean' &&
			typeof ext.maskedConflictingEmail === 'string' &&
			typeof ext.refId === 'string'
		) {
			return {
				code: 'EMAIL_CONFLICT',
				isNewUser: ext.isNewUser,
				maskedConflictingEmail: ext.maskedConflictingEmail,
				maskedExistingEmail:
					typeof ext.maskedExistingEmail === 'string' ? ext.maskedExistingEmail : undefined,
				refId: ext.refId
			};
		}
	}
	return null;
}

export default new HoudiniClient({
	url: '/api/graphql',
	throwOnError: {
		operations: ['mutation', 'subscription'],
		error: (errors, ctx) => {
			// Handle EMAIL_CONFLICT errors specially - redirect to error page
			const emailConflict = getEmailConflictExtensions(errors);
			if (emailConflict) {
				const params = new URLSearchParams({
					scenario: emailConflict.isNewUser ? 'new' : 'change',
					email: emailConflict.maskedConflictingEmail,
					ref: emailConflict.refId
				});
				if (emailConflict.maskedExistingEmail) {
					params.set('existingEmail', emailConflict.maskedExistingEmail);
				}
				const url = `/auth/email-conflict?${params.toString()}`;
				if (browser) {
					// Use goto for client-side navigation
					goto(url);
					return; // Prevent further error handling
				}
				// Server-side: throw redirect
				redirect(302, url);
			}

			const err = errors.at(0);
			if (err) {
				if (browser) {
					toast.error(err.message, { position: 'bottom-right' });
				}
				error(500, errors.map((err) => err.message).join('. ') + ` (${ctx.artifact.name})`);
			} else {
				if (browser) {
					toast.error('Something went wrong', { position: 'bottom-right' });
				}
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
