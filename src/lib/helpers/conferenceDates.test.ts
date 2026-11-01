import { describe, expect, test } from 'vitest';
import { conferenceDatesProblem } from './conferenceDates';

const day = (date: string) => new Date(`${date}T00:00:00Z`);

describe('conferenceDatesProblem', () => {
	test('accepts dates in order, the same day included', () => {
		expect(
			conferenceDatesProblem({
				applicationDeadline: day('2027-01-01'),
				startConference: day('2027-03-01'),
				endConference: day('2027-03-04')
			})
		).toBeUndefined();
		expect(
			conferenceDatesProblem({
				applicationDeadline: day('2027-03-01'),
				startConference: day('2027-03-01'),
				endConference: day('2027-03-01')
			})
		).toBeUndefined();
	});

	test('refuses a deadline after the start', () => {
		expect(
			conferenceDatesProblem({
				applicationDeadline: day('2027-03-02'),
				startConference: day('2027-03-01'),
				endConference: day('2027-03-04')
			})
		).toBe('deadlineAfterStart');
	});

	test('refuses a start after the end', () => {
		expect(
			conferenceDatesProblem({
				applicationDeadline: day('2027-01-01'),
				startConference: day('2027-03-05'),
				endConference: day('2027-03-04')
			})
		).toBe('startAfterEnd');
	});
});
