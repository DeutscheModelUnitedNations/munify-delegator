import { db, schema } from '$api/db/db';
import { enum_, object, query, schemaBuilder } from '$api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { conferenceEmailSettingPubsub } from '$api/pubsub';
import { assertCanManageEmails, registerEmailAbilities } from './emailPermissions';
import { countOpenEmails, previewEmail, scheduleEmailSweep, skipOpenEmails } from './emailSweep';
import { apiError } from '$api/services/errors/apiError';
import { m } from '#lib/paraglide/messages.js';

registerEmailAbilities();

const emailKindEnum = enum_({ tsName: 'emailKind' });
enum_({ tsName: 'emailStatus' });

object({ table: 'conferenceEmailSetting' });
query({ table: 'conferenceEmailSetting' });
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

	/** A mail of `kind` as it would look, addressed to the caller with made-up details. */
	emailPreview: t.field({
		type: EmailPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true })
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
			const preview = await previewEmail(
				args.conferenceId,
				args.kind,
				user,
				ctx.requestUrl().origin
			);
			if (!preview) throw apiError('NOT_FOUND', m.conferenceNotFound());
			return { subject: preview.subject, html: preview.html };
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
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
