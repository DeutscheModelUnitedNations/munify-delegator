/**
 * What the app does when a sign-in finds the account's email address taken by another account:
 * describing the conflict without writing whole addresses into logs, reporting it, and answering
 * with an `EMAIL_CONFLICT` error (or, on the login callback, the page that explains it).
 */
import * as Sentry from '@sentry/sveltekit';
import { db } from '#api/db/db';
import { apiError } from '#api/services/errors/apiError';
import { m } from '#lib/paraglide/messages';

/** Enough of an address to recognise it in a log without writing the whole thing down. */
export function maskEmail(email: string): string {
	const [localPart, domain] = email.split('@');
	if (!domain) return '***';
	if (localPart.length <= 2) return `${localPart[0] ?? ''}***@${domain}`;
	return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * Someone else already holds `email`. Two ways to get here: a brand new account whose address is
 * taken (`existing` is undefined), or an existing account changing to a taken one. The frontend
 * shows a different page for each, so the description says which it is.
 */
export function describeEmailConflict(
	userSubject: string,
	email: string,
	existing: { email: string | null } | undefined
) {
	const isNewUser = existing === undefined;
	const maskedConflictingEmail = maskEmail(email);
	const maskedExistingEmail = existing?.email ? maskEmail(existing.email) : undefined;
	const refId = userSubject.slice(-8);

	const params = new URLSearchParams({
		scenario: isNewUser ? 'new' : 'change',
		email: maskedConflictingEmail,
		ref: refId
	});
	if (maskedExistingEmail) params.set('existingEmail', maskedExistingEmail);

	return {
		isNewUser,
		maskedConflictingEmail,
		maskedExistingEmail,
		refId,
		/** For the log line. */
		label: isNewUser ? 'New user' : 'Email change',
		/** For the error tracker's tags. */
		scenario: isNewUser ? 'new_user' : 'email_change',
		/** What the log and the error tracker record about it. */
		details: {
			userSubject,
			conflictingEmail: maskedConflictingEmail,
			existingUserEmail: maskedExistingEmail ?? 'N/A',
			refId
		},
		/** The page that explains the conflict. */
		redirectTo: `/auth/email-conflict?${params.toString()}`
	};
}

/**
 * Someone else already holds this address. Two ways to get here: a brand new account whose address
 * is taken, or an existing account changing to a taken one. Looks up which it is, logs it and
 * reports it to Sentry, and hands the description back for the caller to answer with - the login
 * flow redirects, the mutation throws - since the frontend shows a different page for each.
 */
export async function reportEmailConflict(userSubject: string, email: string, error: unknown) {
	const existing = await db.query.user.findFirst({
		where: { id: userSubject },
		columns: { email: true }
	});
	const conflict = describeEmailConflict(userSubject, email, existing);

	console.error(`[EMAIL_CONFLICT] ${conflict.label} conflict:`, {
		...conflict.details,
		timestamp: new Date().toISOString()
	});

	Sentry.captureException(error, {
		level: 'warning',
		tags: { error_type: 'email_conflict', scenario: conflict.scenario },
		extra: conflict.details
	});

	return conflict;
}

export type EmailConflict = ReturnType<typeof describeEmailConflict>;

/**
 * The conflict as the API answers it: `EMAIL_CONFLICT`, carrying what the explaining page needs
 * (`redirectTo` included, so a client only has to follow it).
 */
export function emailConflictError(conflict: EmailConflict) {
	return apiError('EMAIL_CONFLICT', m.userEmailInUse(), {
		isNewUser: conflict.isNewUser,
		maskedConflictingEmail: conflict.maskedConflictingEmail,
		maskedExistingEmail: conflict.maskedExistingEmail,
		refId: conflict.refId,
		redirectTo: conflict.redirectTo
	});
}
