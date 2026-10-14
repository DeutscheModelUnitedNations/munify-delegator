/**
 * What the app does when a sign-in finds the account's email address taken by another account:
 * recognising the database error, and describing the conflict without writing whole addresses
 * into logs.
 */

/** The error the database driver raised, which drizzle wraps as the `cause` of its own. */
export function errorCause(error: unknown): unknown {
	return error instanceof Error && 'cause' in error ? error.cause : error;
}

/** Postgres reports a unique violation as 23505; the column shows up in the constraint name. */
export function isUniqueViolationOn(error: unknown, column: string): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; constraint?: unknown; detail?: unknown } = error;
	if (candidate.code !== '23505') return false;
	return (
		String(candidate.constraint ?? '').includes(column) ||
		String(candidate.detail ?? '').includes(column)
	);
}

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
	existing: { email: string | null } | undefined,
	mask: (email: string) => string = maskEmail
) {
	const isNewUser = existing === undefined;
	const maskedConflictingEmail = mask(email);
	const maskedExistingEmail = existing?.email ? mask(existing.email) : undefined;
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
