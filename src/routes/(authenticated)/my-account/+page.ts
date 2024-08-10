import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
	return {
		redirectUrl: url.searchParams.get('redirect') || null,
		accountData: {
			login: 'm.m@mail.com',
			firstName: 'Max',
			lastName: 'Mustermann',
			email: 'm.m@gmail.com',
			uid: '1234567890',
		}
	};
};
