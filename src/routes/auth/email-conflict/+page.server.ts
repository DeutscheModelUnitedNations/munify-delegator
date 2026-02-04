import type { PageServerLoad } from './$types';
import { configPublic } from '$config/public';

export const load: PageServerLoad = async ({ url }) => {
	const scenario = url.searchParams.get('scenario') as 'new' | 'change' | null;
	const email = url.searchParams.get('email');
	const ref = url.searchParams.get('ref');
	const existingEmail = url.searchParams.get('existingEmail');

	return {
		scenario: scenario ?? 'new',
		maskedEmail: email ?? '***@***',
		referenceId: ref ?? 'unknown',
		maskedExistingEmail: existingEmail,
		supportEmail: configPublic.PUBLIC_SUPPORT_EMAIL
	};
};
