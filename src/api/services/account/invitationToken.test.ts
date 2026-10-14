import { describe, expect, test } from 'vitest';
import {
	getInvitationExpiryDate,
	hashToken,
	isOpenInvitation,
	isTokenExpired
} from './invitationToken';

const tomorrow = () => new Date(Date.now() + 86_400_000);
const yesterday = () => new Date(Date.now() - 86_400_000);

const invitation = (
	overrides: Partial<{ revokedAt: Date | null; usedAt: Date | null; expiresAt: Date }> = {}
) => ({
	revokedAt: null,
	usedAt: null,
	expiresAt: tomorrow(),
	...overrides
});

describe('isOpenInvitation', () => {
	test('accepts an invitation that is neither revoked, used nor expired', () => {
		expect(isOpenInvitation(invitation())).toBe(true);
	});

	test('rejects a missing, revoked, used or expired invitation', () => {
		expect(isOpenInvitation(undefined)).toBe(false);
		expect(isOpenInvitation(invitation({ revokedAt: yesterday() }))).toBe(false);
		expect(isOpenInvitation(invitation({ usedAt: yesterday() }))).toBe(false);
		expect(isOpenInvitation(invitation({ expiresAt: yesterday() }))).toBe(false);
	});
});

describe('invitation tokens', () => {
	test('hash deterministically to hex', () => {
		expect(hashToken('abc')).toBe(hashToken('abc'));
		expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
		expect(hashToken('abc')).not.toBe(hashToken('abd'));
	});

	test('expire a week from now', () => {
		const expiry = getInvitationExpiryDate();
		expect(isTokenExpired(expiry)).toBe(false);
		expect(Math.round((expiry.getTime() - Date.now()) / 86_400_000)).toBe(7);
		expect(isTokenExpired(yesterday())).toBe(true);
	});
});
