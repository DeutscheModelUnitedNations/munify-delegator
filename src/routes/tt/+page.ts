import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// we want to keep the link used for the QR code as short as possible
	return redirect(302, `/team-tender`);
};
