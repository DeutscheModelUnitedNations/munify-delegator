import { db, schema } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	conferenceEmailFooterPubsub,
	conferenceEmailSettingPubsub,
	conferenceEmailTextPubsub
} from '#api/pubsub';
import { assertCanManageEmails, registerEmailAbilities } from './emailPermissions';
import {
	countOpenEmails,
	previewEmail,
	scheduleEmailSweep,
	setEmailKindsEnabled,
	skipOpenEmails
} from './emailSweep';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { toLocale } from '#lib/paraglide/runtime';
import { isAlwaysSent } from '#lib/helpers/emailKinds';
import { whereRows } from '#api/db/whereRows';
import { callerUserId } from '#api/services/authHelper/utils';
import { personEmails, sendPersonEmail } from './personEmails';

registerEmailAbilities();

const emailKindEnum = enum_({ tsName: 'emailKind' });
const emailStatusEnum = enum_({ tsName: 'emailStatus' });
enum_({ tsName: 'emailTrigger' });

object({ table: 'conferenceEmailSetting' });
query({ table: 'conferenceEmailSetting' });
object({ table: 'conferenceEmailText' });
query({ table: 'conferenceEmailText' });
object({ table: 'conferenceEmailFooter' });
query({ table: 'conferenceEmailFooter' });
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

const PersonEmail = schemaBuilder.simpleObject('PersonEmail', {
	description: 'A mail one person is owed right now, which the team can send them by hand.',
	fields: (t) => ({
		kind: t.field({ type: emailKindEnum }),
		/** With kind and person, which mail it is. */
		subjectKey: t.string(),
		/** What tells it apart from the person's other mails of its kind. */
		detail: t.string({ nullable: true }),
		/** The conference sends it on its own. */
		automatic: t.boolean(),
		/** How the last try went; none if it was never sent. */
		lastStatus: t.field({ type: emailStatusEnum, nullable: true }),
		lastAt: t.field({ type: 'Date', nullable: true })
	})
});

const SendPersonEmailResult = schemaBuilder.simpleObject('SendPersonEmailResult', {
	fields: (t) => ({
		sent: t.boolean(),
		/** Why the mail service did not send it. */
		error: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * The mails a person is owed in the conference right now, switched on or not, with how each went
	 * so far. Reminders count any time before their date: they can be sent early by hand.
	 */
	personEmails: t.field({
		type: [PersonEmail],
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			/** Ignored; a new value makes the client ask again after a change. */
			revision: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return personEmails({ conferenceId: args.conferenceId, userId: args.userId });
		}
	}),

	/** How many mails of `kind` the conference would send right away if it were switched on. */
	openEmailCount: t.field({
		type: 'Int',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return countOpenEmails({ conferenceId: args.conferenceId, kind: args.kind });
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
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
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
	 * (else the caller's), with the text being edited when `draft` is set (else what is stored), and
	 * with `footer` as the footer when given (else the stored one; empty for none).
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
			body: t.arg.string(),
			footer: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			const callerId = ctx.mustBeLoggedIn().sub;
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
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
			const preview = await previewEmail({
				conferenceId: args.conferenceId,
				kind: args.kind,
				user: { ...user, locale },
				origin: ctx.requestUrl().origin,
				draft: args.draft
					? { subject: args.subject, heading: args.heading, body: args.body }
					: undefined,
				footerDraft: args.footer ?? undefined
			});
			if (!preview) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
			return { subject: preview.subject, html: preview.html };
		}
	})
}));

/** A language the app speaks, or the request fails. */
function assertLocale(value: string) {
	const locale = toLocale(value);
	if (!locale) throw apiError({ code: 'INVALID_INPUT', message: m.emailTextUnknownLanguage() });
	return locale;
}

/** Empty or blank: the default text. */
const ownText = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

schemaBuilder.mutationFields((t) => ({
	/**
	 * Sends a person one mail they are owed right now, however often it went out before and whether
	 * or not its kind is switched on. Logged as sent by hand, by the caller.
	 */
	sendPersonEmail: t.field({
		type: SendPersonEmailResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			subjectKey: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			const sentById = callerUserId(ctx);
			if (!sentById) throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
			const error = await sendPersonEmail({
				conferenceId: args.conferenceId,
				userId: args.userId,
				kind: args.kind,
				subjectKey: args.subjectKey,
				sentById,
				origin: ctx.requestUrl().origin
			});
			if (error === undefined) throw apiError({ code: 'CONFLICT', message: m.emailSendNotOwed() });
			return { sent: error === null, error };
		}
	}),

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
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			const locale = assertLocale(args.locale);
			const text = {
				subject: ownText(args.subject),
				heading: ownText(args.heading),
				body: ownText(args.body)
			};
			const table = schema.conferenceEmailText;
			if (!text.subject && !text.heading && !text.body) {
				await db.delete(table).where(
					whereRows({
						table,
						filter: { conferenceId: args.conferenceId, kind: args.kind, locale }
					})
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
	 * Writes the footer under every mail the conference sends, for one language. An empty one
	 * removes it: mails in that language go out without.
	 */
	setConferenceEmailFooter: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			locale: t.arg.string({ required: true }),
			text: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			const locale = assertLocale(args.locale);
			const text = ownText(args.text);
			const table = schema.conferenceEmailFooter;
			if (!text) {
				await db
					.delete(table)
					.where(whereRows({ table, filter: { conferenceId: args.conferenceId, locale } }));
			} else {
				await db
					.insert(table)
					.values({ conferenceId: args.conferenceId, locale, text })
					.onConflictDoUpdate({
						target: [table.conferenceId, table.locale],
						set: { text, updatedAt: new Date() }
					});
			}
			conferenceEmailFooterPubsub.updated();
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
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			if (isAlwaysSent(args.kind))
				throw apiError({ code: 'INVALID_INPUT', message: m.emailKindAlwaysSent() });
			if (args.enabled && args.notifyExisting === false) {
				await skipOpenEmails({ conferenceId: args.conferenceId, kinds: [args.kind] });
			}
			await setEmailKindsEnabled({
				conferenceId: args.conferenceId,
				kinds: [args.kind],
				enabled: args.enabled
			});
			conferenceEmailSettingPubsub.updated();
			if (args.enabled)
				scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });
			return true;
		}
	})
}));
