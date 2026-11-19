import { describe, expect, test, vi } from 'vitest';
import { CHAT_HIDE_REASON_MAX_LENGTH } from '#lib/helpers/chat';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ chatMessagePubsub: {}, chatPubsub: {} }));

const { hideReasonSchema } = await import('./chatModeration');

describe('hideReasonSchema', () => {
	test('a reason is required', () => {
		expect(hideReasonSchema.safeParse('').success).toBe(false);
		expect(hideReasonSchema.safeParse('   ').success).toBe(false);
		expect(hideReasonSchema.parse('  Beleidigung ')).toBe('Beleidigung');
	});

	test('a reason has a length limit', () => {
		expect(hideReasonSchema.safeParse('x'.repeat(CHAT_HIDE_REASON_MAX_LENGTH)).success).toBe(true);
		expect(hideReasonSchema.safeParse('x'.repeat(CHAT_HIDE_REASON_MAX_LENGTH + 1)).success).toBe(
			false
		);
	});
});
