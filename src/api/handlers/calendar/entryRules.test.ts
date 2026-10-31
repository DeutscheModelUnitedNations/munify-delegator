import { describe, expect, it } from 'vitest';
import { endsAfterStart, entryTimesSchema, entryTrackIdsSchema } from './entryRules';

const at = (time: string) => new Date(`2026-03-12T${time}:00Z`);

describe('endsAfterStart', () => {
	it('needs the end after the start', () => {
		expect(endsAfterStart({ startTime: at('09:00'), endTime: at('10:00') })).toBe(true);
		expect(endsAfterStart({ startTime: at('10:00'), endTime: at('10:00') })).toBe(false);
		expect(endsAfterStart({ startTime: at('11:00'), endTime: at('10:00') })).toBe(false);
	});

	it('passes when one side is left out', () => {
		expect(endsAfterStart({ startTime: at('11:00'), endTime: undefined })).toBe(true);
		expect(endsAfterStart({ startTime: null, endTime: at('10:00') })).toBe(true);
	});
});

describe('entryTimesSchema', () => {
	it('refuses an entry ending before it starts', () => {
		expect(
			entryTimesSchema.safeParse({ startTime: at('11:00'), endTime: at('10:00') }).success
		).toBe(false);
		expect(
			entryTimesSchema.safeParse({ startTime: at('09:00'), endTime: at('10:00') }).success
		).toBe(true);
	});
});

describe('entryTrackIdsSchema', () => {
	it('needs a track', () => {
		expect(entryTrackIdsSchema.safeParse([]).success).toBe(false);
		expect(entryTrackIdsSchema.safeParse(['t1']).success).toBe(true);
	});
});
