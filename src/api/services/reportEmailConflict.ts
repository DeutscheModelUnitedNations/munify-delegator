import * as Sentry from '@sentry/sveltekit';
import { db } from '$api/db/db';
import { describeEmailConflict } from './emailConflict';

/**
 * Someone else already holds this address. Two ways to get here: a brand new account whose address
 * is taken, or an existing account changing to a taken one. Looks up which it is, logs it and
 * reports it to Sentry, and hands the description back for the caller to answer with - the login
 * flow redirects, the mutation throws - since the frontend shows a different page for each.
 */
export async function reportEmailConflict(
	userSubject: string,
	email: string,
	error: unknown,
	mask?: (email: string) => string
) {
	const existing = await db.query.user.findFirst({
		where: { id: userSubject },
		columns: { email: true }
	});
	const conflict = describeEmailConflict(userSubject, email, existing, mask);

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
