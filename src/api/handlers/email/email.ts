import { enum_, object, query, schemaBuilder } from '#api/rumble';
import {
	assertCanManageEmails,
	assertCanNotifyBadgeFound,
	registerEmailAbilities
} from './emailPermissions';
import {
	emailStats,
	localeSchema,
	notifyBadgeFound,
	openEmailCounts,
	optionalLocaleSchema,
	personEmails,
	previewEmailFor,
	sendOpenEmails,
	sendOwedEmail,
	setEmailFooter,
	setEmailText,
	skipEmails,
	switchableKindSchema,
	switchEmailKind
} from './emailService';

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

const OpenEmailCount = schemaBuilder.simpleObject('OpenEmailCount', {
	description: 'How many mails of one kind a conference owes and has not sent.',
	fields: (t) => ({
		kind: t.field({ type: emailKindEnum }),
		open: t.int()
	})
});

const PersonEmail = schemaBuilder.simpleObject('PersonEmail', {
	description: 'A mail one person is owed right now, which the team can send them by hand.',
	fields: (t) => ({
		kind: t.field({ type: emailKindEnum }),
		subjectKey: t.string({ description: 'With kind and person, which mail it is.' }),
		detail: t.string({
			description: "What tells it apart from the person's other mails of its kind.",
			nullable: true
		}),
		automatic: t.boolean({ description: 'The conference sends it on its own.' }),
		lastStatus: t.field({
			description: 'How the last try went; none if it was never sent.',
			type: emailStatusEnum,
			nullable: true
		}),
		lastAt: t.field({ type: 'Date', nullable: true })
	})
});

const SendPersonEmailResult = schemaBuilder.simpleObject('SendPersonEmailResult', {
	fields: (t) => ({
		sent: t.boolean(),
		error: t.string({ description: 'Why the mail service did not send it.', nullable: true })
	})
});

const REVISION_DESCRIPTION = 'Ignored; a new value makes the client ask again after a change.';

schemaBuilder.queryFields((t) => ({
	personEmails: t.field({
		description:
			'The mails a person is owed in the conference right now, switched on or not, with how each went so far. Reminders count any time before their date: they can be sent early by hand. For participant care of the conference; FORBIDDEN otherwise.',
		type: [PersonEmail],
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			revision: t.arg.string({ description: REVISION_DESCRIPTION })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return personEmails({ conferenceId: args.conferenceId, userId: args.userId });
		}
	}),

	openEmailCounts: t.field({
		description:
			'How many mails of each kind the conference owes right now and has not sent, skipped or given up on: what sending them by hand would send. All kinds when `kinds` is left out; the team invitation, which never follows from state, is never counted.',
		type: [OpenEmailCount],
		args: {
			conferenceId: t.arg.id({ required: true }),
			kinds: t.arg({ type: [emailKindEnum] }),
			revision: t.arg.string({ description: REVISION_DESCRIPTION })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return openEmailCounts({ conferenceId: args.conferenceId, kinds: args.kinds });
		}
	}),

	emailStats: t.field({
		description: "Sent, failed and skipped mails per kind, after the conference's log.",
		type: [EmailKindStats],
		args: {
			conferenceId: t.arg.id({ required: true }),
			revision: t.arg.int({ description: REVISION_DESCRIPTION })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return emailStats(args.conferenceId);
		}
	}),

	emailPreview: t.field({
		description:
			"A mail of `kind` as it would look, addressed to the caller with made-up details: in `locale` (else the caller's), with the text being edited when `draft` is set (else what is stored), and with `footer` as the footer when given (else the stored one; empty for none).",
		type: EmailPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			locale: t.arg
				.string({ description: "Empty or left out: the caller's." })
				.validate(optionalLocaleSchema),
			draft: t.arg.boolean({
				description: 'Preview `subject`, `heading` and `body` instead of the stored text.'
			}),
			subject: t.arg.string(),
			heading: t.arg.string(),
			body: t.arg.string(),
			footer: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return previewEmailFor({
				conferenceId: args.conferenceId,
				callerId,
				kind: args.kind,
				locale: args.locale ?? undefined,
				origin: ctx.requestUrl().origin,
				draft: args.draft
					? { subject: args.subject, heading: args.heading, body: args.body }
					: undefined,
				footerDraft: args.footer ?? undefined
			});
		}
	})
}));

/** A conference and some kinds of its mails. */
const conferenceKindsArgs = schemaBuilder.args((t) => ({
	conferenceId: t.id({ required: true }),
	kinds: t.field({ type: [emailKindEnum], required: true })
}));

schemaBuilder.mutationFields((t) => ({
	sendPersonEmail: t.field({
		description:
			'Sends a person one mail they are owed right now, however often it went out before and whether or not its kind is switched on. Logged as sent by hand, by the caller. CONFLICT when they are not owed it (any more).',
		type: SendPersonEmailResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			subjectKey: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return sendOwedEmail({ ...args, sentById: callerId, origin: ctx.requestUrl().origin });
		}
	}),

	notifyBadgeFound: t.field({
		description:
			'Tells the person of a participant row by mail that the badge they lost was handed in to participant care (BADGE_FOUND). Sent right away and logged as sent by hand, by the caller; every call sends it again. NOT_FOUND for a row the caller may not update.',
		type: SendPersonEmailResult,
		args: {
			id: t.arg.id({ required: true, description: "The person's participant row." })
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = await assertCanNotifyBadgeFound({ ctx, participantId: args.id });
			return notifyBadgeFound({ participantId: args.id, sentById: callerId });
		}
	}),

	sendOpenEmails: t.field({
		description:
			'Sends everything of `kinds` the conference owes right now and has not sent, switched to automatic or not, in the background. Answers how many mails that is.',
		type: 'Int',
		args: conferenceKindsArgs,
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return sendOpenEmails({
				conferenceId: args.conferenceId,
				kinds: args.kinds,
				origin: ctx.requestUrl().origin
			});
		}
	}),

	skipOpenEmails: t.field({
		description:
			'Marks everything of `kinds` the conference owes right now as skipped, so it is never sent. Answers how many mails that was.',
		type: 'Int',
		args: conferenceKindsArgs,
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			return skipEmails(args);
		}
	}),

	upsertConferenceEmailText: t.field({
		description:
			"Changes a conference's own text for one kind and language. A field left out stays as it is; an empty one or `null` goes back to the default. Once all three are back, the row goes.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			locale: t.arg.string({ required: true }).validate(localeSchema),
			subject: t.arg.string(),
			heading: t.arg.string(),
			body: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			await setEmailText(args);
			return true;
		}
	}),

	setConferenceEmailFooter: t.field({
		description:
			'Writes the footer under every mail the conference sends, for one language. An empty one removes it: mails in that language go out without.',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			locale: t.arg.string({ required: true }).validate(localeSchema),
			text: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			await setEmailFooter(args);
			return true;
		}
	}),

	setConferenceEmailEnabled: t.field({
		description:
			'Switches the automatic sending of one kind on or off for a conference: the `send-emails` job sends what is owed of the kinds switched on. The kinds always sent where they happen (the team invitation, the found badge) cannot be switched (INVALID_INPUT).',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg({ type: emailKindEnum, required: true }),
			enabled: t.arg.boolean({ required: true }),
			notifyExisting: t.arg.boolean({
				description:
					'Switching on with `false` marks everybody the kind would reach right now as skipped, so only what happens from now on is sent.'
			})
		},
		validate: switchableKindSchema,
		resolve: async (_root, args, ctx) => {
			await assertCanManageEmails({ ctx, conferenceId: args.conferenceId });
			await switchEmailKind(args);
			return true;
		}
	})
}));
