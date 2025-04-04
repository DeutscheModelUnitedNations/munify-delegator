import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	// we want to keep the link used for validation as short as possible to make the QR code smaller
	return redirect(302, `/validateCertificate/${event.params.jwt}`);
};
