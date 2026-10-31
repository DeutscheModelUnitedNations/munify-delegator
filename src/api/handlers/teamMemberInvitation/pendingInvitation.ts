import { getRequestEvent } from '$app/server';
import { logger } from '#lib/logger';
import { pendingInvitationCookieName } from './invitationToken';
import { redeemInvitation } from './teamMemberInvitationService';

/**
 * Someone invited by email arrives with the invitation token in a cookie, set by
 * `auth/accept-invitation` before they were sent off to log in. Redeems it for `userId` and drops
 * the cookie. Failing to redeem it must not block the login.
 */
export async function claimPendingInvitation(userId: string) {
	const event = getRequestEvent();
	const token = event.cookies.get(pendingInvitationCookieName);
	if (!token) return;

	try {
		await redeemInvitation({ token, userId });
	} catch (error) {
		logger.error('Failed to process pending invitation', error);
	} finally {
		event.cookies.delete(pendingInvitationCookieName, { path: '/' });
	}
}
