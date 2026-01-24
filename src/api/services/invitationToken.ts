import { createHash } from 'crypto';
import { customAlphabet } from 'nanoid';

// Cookie name for storing pending invitation token during auth flow
export const pendingInvitationCookieName = 'pending_invitation_token';

// 32 character token using URL-safe characters
const tokenAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const invitationTokenLength = 32;
export const makeInvitationToken = customAlphabet(tokenAlphabet, invitationTokenLength);

/**
 * Hash a token using SHA-256 for secure storage
 * Only the hash is stored in the database, the plaintext token is sent to the user
 */
export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * Get the expiration date for an invitation (7 days from now)
 */
export function getInvitationExpiryDate(): Date {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);
	return expiresAt;
}

/**
 * Check if an invitation token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
	return new Date() > expiresAt;
}
