import { describe, expect, test } from 'vitest';
import { owesOwnFormalities } from './owesOwnFormalities';

describe('owesOwnFormalities', () => {
	test('holds every participant to their own fee and paperwork', () => {
		expect(owesOwnFormalities(undefined)).toBe(true);
		expect(owesOwnFormalities(null)).toBe(true);
	});

	test('holds a supervisor to them only while attending in person', () => {
		expect(owesOwnFormalities({ plansOwnAttendenceAtConference: true })).toBe(true);
		expect(owesOwnFormalities({ plansOwnAttendenceAtConference: false })).toBe(false);
	});
});
