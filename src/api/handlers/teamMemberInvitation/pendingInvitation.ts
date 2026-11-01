import { getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { logger } from '#lib/logger';
import { pendingInvitationCookieName } from './invitationToken';
import { redeemInvitation, type RedeemOutcome } from './teamMemberInvitationService';

/**
 * Someone invited by email arrives with the invitation token in a cookie, set by
 * `auth/accept-invitation` before they were sent off to log in. Redeems it for `userId` and drops
 * the cookie. Failing to redeem it must not block the login; an invitation sent to another address
 * than the account's sends them to the error page saying so, since they would otherwise just find
 * themselves without the team.
 */
export async function claimPendingInvitation(userId: string) {
	const event = getRequestEvent();
	const token = event.cookies.get(pendingInvitationCookieName);
	if (!token) return;

	let outcome: RedeemOutcome = 'notRedeemed';
	try {
		outcome = await redeemInvitation({ token, userId });
	} catch (error) {
		logger.error('Failed to process pending invitation', error);
	} finally {
		event.cookies.delete(pendingInvitationCookieName, { path: '/' });
	}
	if (outcome === 'otherEmail') redirect(302, '/auth/error?type=invitation_other_email');
}
