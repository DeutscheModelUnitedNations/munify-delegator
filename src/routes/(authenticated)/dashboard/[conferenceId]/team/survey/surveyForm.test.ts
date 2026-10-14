import { describe, expect, test } from 'vitest';
import { datetimeLocalToDate } from '$lib/helpers/conferenceTimezoneDate';
import { surveyFields } from './surveyForm';

describe('surveyFields', () => {
	test('needs a title, a description and a deadline', () => {
		expect(surveyFields('', 'd', '2026-03-12T10:00', 'UTC')).toBeUndefined();
		expect(surveyFields('t', '', '2026-03-12T10:00', 'UTC')).toBeUndefined();
		expect(surveyFields('t', 'd', '', 'UTC')).toBeUndefined();
	});

	test('reads the deadline in the conference timezone', () => {
		expect(surveyFields('t', 'd', '2026-03-12T10:00', 'Europe/Berlin')).toEqual({
			title: 't',
			description: 'd',
			deadline: datetimeLocalToDate('2026-03-12T10:00', 'Europe/Berlin')
		});
	});
});
