import { describe, expect, test } from 'vitest';
import { CHAT_REPORT_NOTE_MAX_LENGTH } from '#lib/helpers/chat';
import { reportNoteSchema } from './reportNote';

describe('reportNoteSchema', () => {
	test('a report is settled with or without a note', () => {
		expect(reportNoteSchema.safeParse(undefined).success).toBe(true);
		expect(reportNoteSchema.safeParse(null).success).toBe(true);
		expect(reportNoteSchema.parse('  Mit beiden gesprochen. ')).toBe('Mit beiden gesprochen.');
	});

	test('a note has a length limit', () => {
		expect(reportNoteSchema.safeParse('x'.repeat(CHAT_REPORT_NOTE_MAX_LENGTH)).success).toBe(true);
		expect(reportNoteSchema.safeParse('x'.repeat(CHAT_REPORT_NOTE_MAX_LENGTH + 1)).success).toBe(
			false
		);
	});
});
