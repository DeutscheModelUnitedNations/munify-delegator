import { describe, expect, test } from 'vitest';
import { schoolSummary } from './schoolMetrics';

const row = (participants: number, applied: number, seated: number, attended: number) => ({
	participants,
	applied,
	seated,
	attended,
	fromWaitingList: 1
});

describe('schoolSummary', () => {
	test('adds the conferences up and works out the rates', () => {
		expect(schoolSummary([row(10, 8, 6, 3), row(4, 4, 2, 2), row(0, 0, 0, 0)])).toEqual({
			conferences: 2,
			participants: 14,
			applied: 12,
			seated: 8,
			acceptanceRate: 8 / 12,
			attendanceRate: 5 / 8,
			fromWaitingList: 3
		});
	});

	test('has no rates without applications or seats', () => {
		const summary = schoolSummary([row(2, 0, 0, 0)]);
		expect(summary.acceptanceRate).toBeUndefined();
		expect(summary.attendanceRate).toBeUndefined();
	});
});
