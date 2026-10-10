import { describe, expect, test } from 'vitest';
import { certificateContents } from './certificatePayload';

const start = new Date('2026-03-05T08:00:00Z');
const end = new Date('2026-03-08T16:00:00Z');

const conference = {
	title: 'MUN-SH 2026',
	longTitle: 'Model United Nations Schleswig-Holstein 2026',
	startConference: start,
	endConference: end
};
const user = { givenName: 'erika', familyName: 'mustermann' };

describe('certificateContents', () => {
	test('certifies who attended which conference, and when', () => {
		expect(certificateContents({ didAttend: true, conference, user })).toEqual({
			fullName: 'Erika Mustermann',
			payload: {
				n: 'Erika Mustermann',
				t: 'Model United Nations Schleswig-Holstein 2026',
				s: start.getTime(),
				e: end.getTime()
			}
		});
	});

	test('falls back to the short title and to zero for missing dates', () => {
		const contents = certificateContents({
			didAttend: true,
			conference: {
				title: 'MUN-SH 2026',
				longTitle: null,
				startConference: null,
				endConference: null
			},
			user
		});
		expect(contents?.payload).toEqual({ n: 'Erika Mustermann', t: 'MUN-SH 2026', s: 0, e: 0 });
	});

	test('certifies an unnamed participant with an empty name', () => {
		expect(certificateContents({ didAttend: true, conference, user: null })?.fullName).toBe('');
	});

	test('is undefined before attendance is recorded', () => {
		expect(certificateContents({ didAttend: false, conference, user })).toBeUndefined();
		expect(certificateContents({ didAttend: true, conference: null, user })).toBeUndefined();
	});
});
