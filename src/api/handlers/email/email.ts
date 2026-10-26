import { db, schema } from '#api/db/db.js';
import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { conferenceEmailSettingPubsub, conferenceEmailTextPubsub } from '#api/pubsub.js';
import { assertCanManageEmails, registerEmailAbilities } from './emailPermissions';
import { countOpenEmails, previewEmail, scheduleEmailSweep, skipOpenEmails } from './emailSweep';
import { apiError } from '#api/services/errors/apiError.js';
import { m } from '#lib/paraglide/messages.js';
import { toLocale } from '#lib/paraglide/runtime.js';
import { and, eq } from 'drizzle-orm';

registerEmailAbilities();

const emailKindEnum = enum_({ tsName: 'emailKind' });
enum_({ tsName: 'emailStatus' });

object({ table: 'conferenceEmailSetting' });
query({ table: 'conferenceEmailSetting' });
object({ table: 'conferenceEmailText' });
query({ table: 'conferenceEmailText' });
object({ table: 'emailLog' });
query({ table: 'emailLog' });

const EmailPreview = schemaBuilder.simpleObject('EmailPreview', {
	fields: (t) => ({
		subject: t.string(),
		html: t.string()
	})
});

const EmailKindStats = schemaBuilder.simpleObject('EmailKindStats', {
	description: 'What the log says about one kind of automatic mail in a conference.',
	fields: (t) => ({
		kind: t.field({ type: emailKindEnum }),
		sent: t.int(),
		failed: t.int(),
		skipped: t.int()
	})
});

schemaBuilder.queryFields((t) => ({
	/** How many mails of `kind` the conference would send right away if it were switched on. */
	openEmailCount: t.field({
		type: 'Int',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails(ctx, args.conferenceId);
			return countOpenEmails(args.conferenceId, args.kind);
		}
	}),

	/** Sent, failed and skipped mails per kind. */
	emailStats: t.field({
		type: [EmailKindStats],
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Ignored; a new value makes the client ask again after a change. */
			revision: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails(ctx, args.conferenceId);
			const rows = await db.query.emailLog.findMany({
				where: { conferenceId: args.conferenceId },
				columns: { kind: true, status: true }
			});
			return schema.emailKind.enumValues.map((kind) => {
				const of = rows.filter((row) => row.kind === kind);
				return {
					kind,
					sent: of.filter((row) => row.status === 'SENT').length,
					failed: of.filter((row) => row.status === 'FAILED').length,
					skipped: of.filter((row) => row.status === 'SKIPPED').length
				};
			});
		}
	}),

	/**
	 * A mail of `kind` as it would look, addressed to the caller with made-up details: in `locale`
	 * (else the caller's), with the text being edited when `draft` is set (else what is stored).
	 */
	emailPreview: t.field({
		type: EmailPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			locale: t.arg.string(),
			draft: t.arg.boolean(),
			subject: t.arg.string(),
			heading: t.arg.string(),
			body: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;
			await assertCanManageEmails(ctx, args.conferenceId);
			const user = await db.query.user
				.findFirst({
					where: { id: callerId },
					columns: {
						id: true,
						email: true,
						givenName: true,
						familyName: true,
						locale: true,
						birthday: true
					}
				})
				.then(assertFindFirstExists);
			const locale = args.locale ? assertLocale(args.locale) : user.locale;
			const preview = await previewEmail(
				args.conferenceId,
				args.kind,
				{ ...user, locale },
				ctx.requestUrl().origin,
				args.draft ? { subject: args.subject, heading: args.heading, body: args.body } : undefined
			);
			if (!preview) throw apiError('NOT_FOUND', m.conferenceNotFound());
			return { subject: preview.subject, html: preview.html };
		}
	})
}));

/** A language the app speaks, or the request fails. */
function assertLocale(value: string) {
	const locale = toLocale(value);
	if (!locale) throw apiError('INVALID_INPUT', m.emailTextUnknownLanguage());
	return locale;
}

/** Empty or blank: the default text. */
const ownText = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

schemaBuilder.mutationFields((t) => ({
	/**
	 * Writes a conference's own text for one kind and language. A field left empty keeps the
	 * default; all three empty removes the row, back to the default text.
	 */
	setConferenceEmailText: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			locale: t.arg.string({ required: true }),
			subject: t.arg.string(),
			heading: t.arg.string(),
			body: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails(ctx, args.conferenceId);
			const locale = assertLocale(args.locale);
			const text = {
				subject: ownText(args.subject),
				heading: ownText(args.heading),
				body: ownText(args.body)
			};
			const table = schema.conferenceEmailText;
			if (!text.subject && !text.heading && !text.body) {
				await db
					.delete(table)
					.where(
						and(
							eq(table.conferenceId, args.conferenceId),
							eq(table.kind, args.kind),
							eq(table.locale, locale)
						)
					);
			} else {
				await db
					.insert(table)
					.values({ conferenceId: args.conferenceId, kind: args.kind, locale, ...text })
					.onConflictDoUpdate({
						target: [table.conferenceId, table.kind, table.locale],
						set: { ...text, updatedAt: new Date() }
					});
			}
			conferenceEmailTextPubsub.updated();
			return true;
		}
	}),

	/**
	 * Switches one kind of automatic mail on or off for a conference. Switching it on with
	 * `notifyExisting: false` marks everybody it would reach right now as skipped, so only what
	 * happens from now on is sent.
	 */
	setConferenceEmailEnabled: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			enabled: t.arg.boolean({ required: true }),
			notifyExisting: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails(ctx, args.conferenceId);
			if (args.enabled && args.notifyExisting === false) {
				await skipOpenEmails(args.conferenceId, args.kind);
			}
			await db
				.insert(schema.conferenceEmailSetting)
				.values({ conferenceId: args.conferenceId, kind: args.kind, enabled: args.enabled })
				.onConflictDoUpdate({
					target: [schema.conferenceEmailSetting.conferenceId, schema.conferenceEmailSetting.kind],
					set: { enabled: args.enabled, updatedAt: new Date() }
				});
			conferenceEmailSettingPubsub.updated();
			if (args.enabled) scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);
			return true;
		}
	})
}));
