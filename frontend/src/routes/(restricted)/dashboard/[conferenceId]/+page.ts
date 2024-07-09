import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	return {
		conferenceId: params.conferenceId,
		testData: [
			{
				conferenceId: 1,
				conferenceName: 'MUN-SH 2025',
				active: true,
				accepted: true
			},
			{
				conferenceId: 2,
				conferenceName: 'MUNBW 2025',
				active: true,
				accepted: false
			},
			{
				conferenceId: 3,
				conferenceName: 'MUN-SH 2024',
				active: false,
				accepted: true
			}
		]
	};
};
