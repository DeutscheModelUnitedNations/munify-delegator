import { describe, expect, test } from 'vitest';
import { getInvitationExpiryDate, hashToken } from './invitationToken';

describe('invitation tokens', () => {
	test('hash deterministically to hex', () => {
		expect(hashToken('abc')).toBe(hashToken('abc'));
		expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
		expect(hashToken('abc')).not.toBe(hashToken('abd'));
	});

	test('expire a week from now', () => {
		const expiry = getInvitationExpiryDate();
		expect(Math.round((expiry.getTime() - Date.now()) / 86_400_000)).toBe(7);
	});
});
