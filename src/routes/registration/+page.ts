import type { PageLoad } from './$types';

interface ConferenceData {
	id: string;
	titel: string;
	start?: Date;
	end?: Date;
	location: string;
	website: string;
	image: string;
}

export const load: PageLoad = () => {
	const dummyConferenceData: ConferenceData[] = [
		{
			id: '128312',
			titel: 'MUN-SH 2025',
			start: new Date('2025-03-06'),
			end: new Date('2025-03-10'),
			location: 'Kiel',
			website: 'https://www.mun-sh.de',
			image: '/dmun-stock/sh1.jpg'
		},
		{
			id: '128313',
			titel: 'MUNBW 2025',
			location: 'Stuttgart',
			website: 'https://www.munbw.de',
			image: '/dmun-stock/bw1.jpg'
		}
	];

	return { conferences: dummyConferenceData };
};
