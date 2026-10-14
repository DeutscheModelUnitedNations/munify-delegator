import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { assertInvitationUsable } from './invitationValidity';

const future = new Date(Date.now() + 60 * 60 * 1000);
const past = new Date(Date.now() - 60 * 60 * 1000);
const pending = { revokedAt: null, usedAt: null, expiresAt: future };

/** The HTTP error `invitation` is refused with. */
function refusal(invitation: Parameters<typeof assertInvitationUsable>[0]) {
	try {
		assertInvitationUsable(invitation);
	} catch (e) {
		if (isHttpError(e)) return { status: e.status, message: e.body.message };
		throw e;
	}
	return null;
}

describe('assertInvitationUsable', () => {
	test('accepts a pending invitation', () => {
		expect(refusal(pending)).toBeNull();
	});

	test('refuses an unknown invitation', () => {
		expect(refusal(undefined)).toEqual({
			status: 404,
			message: 'Invitation not found or invalid'
		});
	});

	test('refuses revoked, used and expired invitations', () => {
		expect(refusal({ ...pending, revokedAt: past })).toEqual({
			status: 410,
			message: 'This invitation has been revoked'
		});
		expect(refusal({ ...pending, usedAt: past })).toEqual({
			status: 410,
			message: 'This invitation has already been used'
		});
		expect(refusal({ ...pending, expiresAt: past })).toEqual({
			status: 410,
			message: 'This invitation has expired'
		});
	});
});
