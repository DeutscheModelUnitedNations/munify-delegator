import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import {
	conferenceEmailFooterPubsub,
	conferenceEmailSettingPubsub,
	conferenceEmailTextPubsub
} from '#api/pubsub';
import { assertFirstEntryExists } from '@m1212e/rumble';
import type { EmailKind } from './dueEmails';
import type { Locale } from '#lib/paraglide/runtime';

/**
 * What a conference makes of its automatic mails: which kinds go out on their own
 * (`conferenceEmailSetting`), its own texts per kind and language (`conferenceEmailText`) and the
 * footer under every mail per language (`conferenceEmailFooter`).
 */

/** The kinds the conference sends on its own. */
export async function enabledKinds(conferenceId: string) {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { conferenceId, enabled: true },
		columns: { kind: true }
	});
	return new Set<EmailKind>(settings.map((setting) => setting.kind));
}

/** Switches kinds of automatic mail on or off for a conference. */
export async function setEmailKindsEnabled({
	conferenceId,
	kinds,
	enabled
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	enabled: boolean;
}) {
	if (kinds.length === 0) return;
	const rows = await db
		.insert(schema.conferenceEmailSetting)
		.values(kinds.map((kind) => ({ conferenceId, kind, enabled })))
		.onConflictDoUpdate({
			target: [schema.conferenceEmailSetting.conferenceId, schema.conferenceEmailSetting.kind],
			set: { enabled, updatedAt: new Date() }
		})
		.returning({ id: schema.conferenceEmailSetting.id });
	// an upsert: new rows for the lists, changed ones by id
	conferenceEmailSettingPubsub.created();
	conferenceEmailSettingPubsub.updated(rows.map((row) => row.id));
}

/** Every conference that sends any automatic mail. */
export async function conferencesSendingEmails() {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { enabled: true },
		columns: { conferenceId: true }
	});
	return [...new Set(settings.map((setting) => setting.conferenceId))];
}

/** Empty or blank: the default text. */
const ownText = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

/** A change to one field of a text: left out keeps it, empty or `null` goes back to the default. */
const textChange = (value: string | null | undefined) =>
	value === undefined ? undefined : ownText(value);

/**
 * Changes the conference's own text for one kind and language. A field left out stays as it is; an
 * empty one or `null` goes back to the default. Once all three are back, the row goes.
 */
export async function setEmailText({
	conferenceId,
	kind,
	locale,
	subject,
	heading,
	body
}: {
	conferenceId: string;
	kind: EmailKind;
	locale: Locale;
	subject?: string | null;
	heading?: string | null;
	body?: string | null;
}) {
	const changes = {
		subject: textChange(subject),
		heading: textChange(heading),
		body: textChange(body)
	};
	const table = schema.conferenceEmailText;
	const { id, deleted } = await db.transaction(async (tx) => {
		const row = await tx
			.insert(table)
			.values({ conferenceId, kind, locale, ...changes })
			.onConflictDoUpdate({
				target: [table.conferenceId, table.kind, table.locale],
				set: { ...changes, updatedAt: new Date() }
			})
			.returning()
			.then(assertFirstEntryExists);
		if (!row.subject && !row.heading && !row.body) {
			await tx.delete(table).where(whereRows({ table, filter: { id: row.id } }));
			return { id: row.id, deleted: true };
		}
		return { id: row.id, deleted: false };
	});
	if (deleted) {
		conferenceEmailTextPubsub.removed();
		return;
	}
	// an upsert: a new row for the lists, a changed one by id
	conferenceEmailTextPubsub.created();
	conferenceEmailTextPubsub.updated(id);
}

/**
 * Writes the footer under every mail the conference sends in `locale`. An empty one removes it:
 * mails in that language go out without.
 */
export async function setEmailFooter({
	conferenceId,
	locale,
	text: given
}: {
	conferenceId: string;
	locale: Locale;
	text: string;
}) {
	const text = ownText(given);
	const table = schema.conferenceEmailFooter;
	if (!text) {
		await db.delete(table).where(whereRows({ table, filter: { conferenceId, locale } }));
		conferenceEmailFooterPubsub.removed();
		return;
	}
	const row = await db
		.insert(table)
		.values({ conferenceId, locale, text })
		.onConflictDoUpdate({
			target: [table.conferenceId, table.locale],
			set: { text, updatedAt: new Date() }
		})
		.returning({ id: table.id })
		.then(assertFirstEntryExists);
	// an upsert: a new row for the lists, a changed one by id
	conferenceEmailFooterPubsub.created();
	conferenceEmailFooterPubsub.updated(row.id);
}
