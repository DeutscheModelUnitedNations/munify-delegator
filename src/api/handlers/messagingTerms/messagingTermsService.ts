import { z } from 'zod';
import { db } from '#api/db/db';
import * as schema from '#api/db/schema/index';
import { m } from '#lib/paraglide/messages';
import type { Locale } from '#lib/paraglide/runtime';
import {
	acceptanceHolds,
	contentHash,
	TERMS_LOCALES,
	termsInLocale,
	type TermsDocument
} from './messagingTermsDocument';
import { currentTerms } from './terms';

/**
 * The message service's terms (`terms/*.yaml`) and who accepted them
 * (`messaging_terms_acceptance`). See "Messages" in CLAUDE.md.
 */

/** The terms as they stand, in `locale`, with the hash an acceptance has to name. */
export function termsFor(locale: Locale) {
	const terms = termsInLocale({ document: currentTerms, locale });
	return { ...terms, contentHash: contentHash(terms) };
}

/**
 * What `acceptMessagingTerms` is given, checked against `document`: the version and revision the
 * reader was shown, the hash of the text in their locale, and every confirmation ticked. Hands the
 * resolver the shown terms. Anything that no longer matches is INVALID_INPUT, and the dialog asks
 * for a reload, so nobody accepts a text they were not shown.
 */
function acceptTermsArgsSchema(document: TermsDocument) {
	return z
		.looseObject({
			version: z.number(),
			revision: z.number(),
			contentHash: z.string(),
			confirmationIds: z.array(z.string())
		})
		.transform((args, context) => {
			const shown = TERMS_LOCALES.map((locale) => termsInLocale({ document, locale })).find(
				(terms) =>
					terms.version === args.version &&
					terms.revision === args.revision &&
					contentHash(terms) === args.contentHash
			);
			if (!shown) {
				context.addIssue({ code: 'custom', message: m.chatTermsOutdated() });
				return z.NEVER;
			}
			const confirmationIds = [...new Set(args.confirmationIds)];
			if (
				!acceptanceHolds({ document, acceptance: { version: shown.version, confirmationIds } }) ||
				confirmationIds.length !== document.confirmations.length
			) {
				context.addIssue({ code: 'custom', message: m.chatTermsConfirmAll() });
				return z.NEVER;
			}
			return { shown, confirmationIds };
		});
}

export const acceptCurrentTermsArgsSchema = acceptTermsArgsSchema(currentTerms);

/** Whether the user accepted the message service's terms as they stand. */
export async function hasAcceptedTerms(userId: string) {
	const acceptances = await db.query.messagingTermsAcceptance.findMany({
		where: { userId, version: currentTerms.version },
		columns: { version: true, confirmationIds: true }
	});
	return acceptances.some((acceptance) => acceptanceHolds({ document: currentTerms, acceptance }));
}

/** Records that the user accepted `shown`, the terms in the locale they read them in. */
export async function acceptMessagingTerms({
	userId,
	shown,
	confirmationIds
}: {
	userId: string;
	shown: ReturnType<typeof termsInLocale>;
	confirmationIds: string[];
}) {
	// Nothing in the API reads these rows, so nobody is told of a new one.
	await db
		.insert(schema.messagingTermsAcceptance)
		.values({
			userId,
			version: shown.version,
			revision: shown.revision,
			locale: shown.locale,
			contentHash: contentHash(shown),
			confirmationIds
		})
		.onConflictDoNothing({
			target: [
				schema.messagingTermsAcceptance.userId,
				schema.messagingTermsAcceptance.version,
				schema.messagingTermsAcceptance.revision
			]
		});
}
