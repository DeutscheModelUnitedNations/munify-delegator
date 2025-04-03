import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { params, locals, url } = event;

	const jwt = url.searchParams.get('jwt');

	// TODO implement JWT data extraction and verification

	const fullName = 'Antonio Guterres';
	const conferenceTitle = 'Model United Nations Schleswig-Holstein';
	const conferenceStartDate = new Date('2023-10-01T00:00:00Z');
	const conferenceEndDate = new Date('2023-10-05T00:00:00Z');

	return {
		fullName,
		conferenceTitle,
		conferenceStartDate,
		conferenceEndDate
	};
};
