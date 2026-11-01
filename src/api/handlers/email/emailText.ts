import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
import type { Locale } from '#lib/paraglide/runtime';
import {
	defaultEmailText,
	type EmailPlaceholder,
	type EmailText
} from '#lib/helpers/emailTemplates';

/**
 * Filling a conference's mail texts in (`#lib/helpers/emailTemplates` holds the defaults and the
 * placeholders, which the editor shows too).
 */

/** A conference's own text for a kind and language; a field left empty keeps the default. */
export interface EmailTextOverride {
	subject?: string | null;
	heading?: string | null;
	body?: string | null;
}

/** The values a mail fills its placeholders with; `list` is the kind's items, not a value. */
export type EmailPlaceholderValues = Partial<Record<Exclude<EmailPlaceholder, 'list'>, string>>;

/** The text to send: the conference's own fields where it has them, the default elsewhere. */
export function resolveEmailText({
	kind,
	locale,
	override
}: {
	kind: EmailkindEnum;
	locale: Locale;
	override?: EmailTextOverride | null;
}): EmailText {
	const fallback = defaultEmailText({ kind, locale });
	const own = (value: string | null | undefined) => (value?.trim() ? value : undefined);
	return {
		subject: own(override?.subject) ?? fallback.subject,
		heading: own(override?.heading) ?? fallback.heading,
		body: own(override?.body) ?? fallback.body
	};
}

/** What the mail template draws: the filled-in text, with the list where the body places it. */
export interface FilledEmailText {
	subject: string;
	heading: string;
	paragraphs: string[];
	items: string[];
	/** Paragraphs after the list. */
	closing: string[];
}

/**
 * Fills a template in. An unknown placeholder stays as it is written, so a typo shows in the
 * preview rather than vanishing; a paragraph that comes out empty (`{delegationHint}` for someone
 * without a delegation) is dropped. Without `{list}` the list follows the body.
 */
export function fillEmailText({
	text,
	values,
	items = []
}: {
	text: EmailText;
	values: EmailPlaceholderValues;
	items?: readonly string[];
}): FilledEmailText {
	const known: Record<string, string | undefined> = values;
	const fill = (value: string) =>
		value.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
			key !== 'list' && known[key] !== undefined ? known[key] : placeholder
		);
	const blocks = text.body
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter(Boolean);
	const listAt = blocks.indexOf('{list}');
	const filled = (part: string[]) => part.map((block) => fill(block).trim()).filter(Boolean);
	return {
		subject: fill(text.subject).replace(/\s+/g, ' ').trim(),
		heading: fill(text.heading).trim(),
		paragraphs: filled(listAt === -1 ? blocks : blocks.slice(0, listAt)),
		items: [...items],
		closing: listAt === -1 ? [] : filled(blocks.slice(listAt + 1))
	};
}

/**
 * A conference's footer for its mails (`conference_email_footer`), as the paragraphs under every
 * mail: blank lines separate them, `{conference}` is the conference's name. None for an empty one.
 */
export function emailFooterParagraphs({
	footer,
	conferenceTitle
}: {
	footer: string | null | undefined;
	conferenceTitle: string;
}): string[] {
	return (footer ?? '')
		.split(/\n\s*\n/)
		.map((block) => block.replaceAll('{conference}', conferenceTitle).trim())
		.filter(Boolean);
}
