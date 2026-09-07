import { describe, expect, it } from 'vitest';
import { dateToFormValue, dateToInputValue, inputValueToDate } from '$lib/services/dateTimeInput';

describe('dateTimeInput', () => {
	describe('dateToFormValue', () => {
		it('serializes to an absolute instant so the server cannot reinterpret it', () => {
			const date = new Date('2026-02-20T07:00:00.000Z');
			const submitted = dateToFormValue(date);

			// The value must carry its timezone, otherwise a server running in another
			// timezone than the browser shifts the instant on every save.
			expect(submitted).toBe('2026-02-20T07:00:00.000Z');
			expect(new Date(submitted).getTime()).toBe(date.getTime());
		});

		it('returns an empty string for missing or invalid dates', () => {
			expect(dateToFormValue(undefined)).toBe('');
			expect(dateToFormValue(new Date('nonsense'))).toBe('');
		});
	});

	describe('datetime round trip', () => {
		it('keeps the instant stable across repeated saves', () => {
			const stored = new Date('2026-02-20T07:00:00.000Z');

			// Render into the input, read the value back out as the browser would,
			// then submit it - three times, as a user hitting save repeatedly.
			let current = stored;
			for (let i = 0; i < 3; i++) {
				const shown = dateToInputValue(current, true);
				const readBack = inputValueToDate(shown, true);
				current = new Date(dateToFormValue(readBack));
			}

			expect(current.getTime()).toBe(stored.getTime());
		});

		it('renders the browser wall clock without seconds', () => {
			const date = new Date(2026, 1, 20, 9, 5);
			expect(dateToInputValue(date, true)).toBe('2026-02-20T09:05');
		});
	});

	describe('date only', () => {
		it('renders the UTC calendar date', () => {
			expect(dateToInputValue(new Date('2000-05-03T00:00:00.000Z'), false)).toBe('2000-05-03');
		});

		it('parses to UTC midnight, independent of the browser timezone', () => {
			expect(inputValueToDate('2000-05-03', false)?.toISOString()).toBe('2000-05-03T00:00:00.000Z');
		});

		it('keeps the day stable across repeated saves', () => {
			let current: Date | undefined = new Date('2000-05-03T00:00:00.000Z');
			for (let i = 0; i < 3; i++) {
				const shown = dateToInputValue(current, false);
				current = new Date(dateToFormValue(inputValueToDate(shown, false)));
			}
			expect(current.toISOString()).toBe('2000-05-03T00:00:00.000Z');
		});
	});

	describe('empty input', () => {
		it('maps an empty input value to undefined', () => {
			expect(inputValueToDate('', true)).toBeUndefined();
			expect(inputValueToDate('', false)).toBeUndefined();
			expect(dateToInputValue(undefined, true)).toBe('');
		});
	});
});
