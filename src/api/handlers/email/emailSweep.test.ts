import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db.js', () => ({ db: {}, schema: {} }));
vi.mock('#api/services/email/emailService.js', () => ({ emailService: {} }));
vi.mock('#api/pubsub.js', () => ({ emailLogPubsub: { updated: () => undefined } }));
vi.mock('#lib/emails/index.js', () => ({
	renderEmail: () => undefined,
	NotificationEmail: undefined
}));
vi.mock('#api/services/requestLocale.js', () => ({
	localeOfUser: () => 'de',
	runWithLocale: (_locale: string, fn: () => unknown) => fn()
}));

const { isOpen } = await import('./emailSweep');

const now = new Date('2026-11-01T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('isOpen', () => {
	test('sends what has no log row yet', () => {
		expect(isOpen(undefined, now)).toBe(true);
	});

	test('never sends twice what was sent or skipped', () => {
		expect(isOpen({ status: 'SENT', attempts: 1, updatedAt: minutesAgo(600) }, now)).toBe(false);
		expect(isOpen({ status: 'SKIPPED', attempts: 0, updatedAt: minutesAgo(600) }, now)).toBe(false);
	});

	test('tries a failed mail three times', () => {
		expect(isOpen({ status: 'FAILED', attempts: 2, updatedAt: now }, now)).toBe(true);
		expect(isOpen({ status: 'FAILED', attempts: 3, updatedAt: now }, now)).toBe(false);
	});

	test('takes over a claim only once it is stale', () => {
		expect(isOpen({ status: 'SENDING', attempts: 1, updatedAt: minutesAgo(5) }, now)).toBe(false);
		expect(isOpen({ status: 'SENDING', attempts: 1, updatedAt: minutesAgo(20) }, now)).toBe(true);
	});
});
