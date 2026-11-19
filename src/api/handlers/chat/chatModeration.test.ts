import { describe, expect, test, vi } from 'vitest';
import { CHAT_HIDE_REASON_MAX_LENGTH } from '#lib/helpers/chat';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ chatMessagePubsub: {}, chatPubsub: {} }));

const { assertHideable, hiddenByReport, hideReasonSchema } = await import('./chatModeration');

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

describe('assertHideable', () => {
	test('a message not hidden yet may be hidden', () => {
		expect(() => assertHideable({ hiddenAt: null })).not.toThrow();
	});

	test('a message not in the chat is NOT_FOUND', () => {
		expect(() => assertHideable(undefined)).toThrow(
			expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
		);
	});

	test('hiding is final: a hidden message is a CONFLICT, its reason stays', () => {
		expect(() => assertHideable({ hiddenAt: new Date() })).toThrow(
			expect.objectContaining({ extensions: { code: 'CONFLICT' } })
		);
	});
});

describe('hiddenByReport', () => {
	const row = (id: string, reportId: string | null, hidden = true) => ({
		id,
		reportId,
		body: `Text ${id}`,
		createdAt: new Date('2026-11-19T10:00:00Z'),
		authorParticipantId: 'p-a',
		hiddenAt: hidden ? new Date('2026-11-19T11:00:00Z') : null,
		hiddenById: 'care',
		hiddenReason: hidden ? 'Beleidigung' : null
	});

	test('groups the hidden messages by report, in the order read', () => {
		const grouped = hiddenByReport([row('m1', 'r1'), row('m2', 'r2'), row('m3', 'r1')]);
		expect(grouped.get('r1')?.map((message) => message.id)).toEqual(['m1', 'm3']);
		expect(grouped.get('r2')?.map((message) => message.id)).toEqual(['m2']);
		expect(grouped.get('r1')?.[0]).toMatchObject({
			body: 'Text m1',
			hiddenReason: 'Beleidigung',
			hiddenById: 'care'
		});
	});

	test('leaves out rows without a report or without their hiding', () => {
		const grouped = hiddenByReport([row('m1', null), row('m2', 'r1', false)]);
		expect([...grouped.keys()]).toEqual([]);
	});
});
