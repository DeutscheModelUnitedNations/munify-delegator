import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Locale } from '#lib/paraglide/runtime';

/**
 * The terms of the message service as a document: one YAML file per version under `terms/`, every
 * text in every locale. Pure, so the API, the tests and the e2e seed (under Bun) read the files
 * the same way; `terms.ts` is how the app loads them.
 */

/**
 * A text in every locale the app speaks: a file missing one does not load. `terms.test.ts` checks
 * that these are Paraglide's locales.
 */
function localized<T extends z.ZodType>(value: T) {
	return z.strictObject({ de: value, en: value });
}

/** The locales a terms file holds. */
export const TERMS_LOCALES = ['de', 'en'] as const satisfies readonly Locale[];

const text = z.string().trim().min(1);
const termsId = z.string().regex(/^[a-z][a-z0-9-]*$/);

const termsDocumentSchema = z
	.strictObject({
		version: z.number().int().positive(),
		revision: z.number().int().nonnegative(),
		intro: localized(text),
		sections: z
			.array(
				z.strictObject({
					id: termsId,
					icon: z.string().regex(/^[a-z][a-z0-9-]*$/),
					title: localized(text),
					summary: localized(text),
					body: localized(z.array(text).min(1)),
					callout: localized(text).optional()
				})
			)
			.min(1),
		confirmations: z.array(z.strictObject({ id: termsId, text: localized(text) })).min(1)
	})
	.superRefine((document, context) => {
		for (const [path, ids] of [
			['sections', document.sections.map((section) => section.id)],
			['confirmations', document.confirmations.map((confirmation) => confirmation.id)]
		] as const) {
			if (new Set(ids).size !== ids.length) {
				context.addIssue({ code: 'custom', path: [path], message: `${path} ids must be unique` });
			}
		}
	});

export type TermsDocument = z.infer<typeof termsDocumentSchema>;

/** Reads one version's file. Throws, naming the file, when it does not hold valid terms. */
export function parseTermsDocument({ source, name }: { source: string; name: string }) {
	const result = termsDocumentSchema.safeParse(parse(source));
	if (!result.success) {
		throw new Error(
			`${name} does not hold valid messaging terms: ${z.prettifyError(result.error)}`
		);
	}
	return result.data;
}

/** The newest version among the files: the terms as they stand. */
export function latestTerms(documents: readonly TermsDocument[]) {
	const [latest] = [...documents].sort((a, b) => b.version - a.version);
	if (!latest) throw new Error('No messaging terms found');
	const versions = documents.map((document) => document.version);
	if (new Set(versions).size !== versions.length) {
		throw new Error('Two files hold the same version of the messaging terms');
	}
	return latest;
}

/** The terms as one reader is shown them: every text in their locale. */
export function termsInLocale({ document, locale }: { document: TermsDocument; locale: Locale }) {
	return {
		version: document.version,
		revision: document.revision,
		locale,
		intro: document.intro[locale],
		sections: document.sections.map((section) => ({
			id: section.id,
			icon: section.icon,
			title: section.title[locale],
			summary: section.summary[locale],
			paragraphs: section.body[locale],
			callout: section.callout?.[locale] ?? null
		})),
		confirmations: document.confirmations.map((confirmation) => ({
			id: confirmation.id,
			text: confirmation.text[locale]
		}))
	};
}

export type LocalizedTerms = ReturnType<typeof termsInLocale>;

function sha256(value: unknown) {
	return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * What a reader agreeing to `terms` was shown, as a hash: version, revision, locale and every
 * text. It is stored with the acceptance, so the agreement names the exact wording.
 */
export function contentHash(terms: LocalizedTerms) {
	return sha256(terms);
}

/** The whole document in every locale, as a hash: what `terms.test.ts` pins per revision. */
export function documentHash(document: TermsDocument) {
	return sha256(document);
}

/**
 * Whether an acceptance still holds: given for the current version and every confirmation the
 * terms ask for (a confirmation added later asks again). A revision changes no meaning.
 */
export function acceptanceHolds({
	document,
	acceptance
}: {
	document: TermsDocument;
	acceptance: { version: number; confirmationIds: readonly string[] };
}) {
	return (
		acceptance.version === document.version &&
		document.confirmations.every((confirmation) =>
			acceptance.confirmationIds.includes(confirmation.id)
		)
	);
}
