import { error } from '@sveltejs/kit';
import { isTokenExpired } from '$api/services/invitationToken';

interface InvitationState {
	revokedAt: Date | null;
	usedAt: Date | null;
	expiresAt: Date;
}

/**
 * Fails with the status explaining why an invitation cannot be accepted: it does not exist, was
 * revoked, was already used or has expired.
 */
export function assertInvitationUsable<I extends InvitationState>(
	invitation: I | undefined
): asserts invitation is I {
	if (!invitation) {
		error(404, 'Invitation not found or invalid');
	}

	if (invitation.revokedAt) {
		error(410, 'This invitation has been revoked');
	}

	if (invitation.usedAt) {
		error(410, 'This invitation has already been used');
	}

	if (isTokenExpired(invitation.expiresAt)) {
		error(410, 'This invitation has expired');
	}
}
