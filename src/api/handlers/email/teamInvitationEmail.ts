import { renderEmail, TeamInvitationEmail } from '#api/services/email/templates/index';
import type { TeamRole } from '#api/services/authHelper/rules';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { m } from '#lib/paraglide/messages';
import type { Locale } from '#lib/paraglide/runtime';
import {
	emailFooterParagraphs,
	fillEmailText,
	resolveEmailText,
	type EmailPlaceholderValues,
	type EmailTextOverride
} from './emailText';
import { runWithLocale } from '#api/services/requestLocale';
import { loadWording, sendByHand, wordingIn } from './emailDelivery';

/**
 * The invitation into a conference's team. Its link carries a token only the inviting request
 * knows, so it is sent by hand right there rather than by the sweep, and always goes out; it is
 * logged like every mail sent by hand, to the address, as the invitation. Its text is the
 * conference's own where it wrote one (`conference_email_text`), else the default, like the
 * automatic mails. Everyone who joins the team gets the automatic `TEAM_WELCOME` afterwards.
 */

/** Subject, heading and paragraphs of the invitation, filled in; call inside `runWithLocale`. */
function invitationText({
	locale,
	own,
	values
}: {
	locale: Locale;
	own: EmailTextOverride | null | undefined;
	values: EmailPlaceholderValues;
}) {
	const filled = fillEmailText({
		text: resolveEmailText({ kind: 'TEAM_INVITATION', locale, override: own }),
		values
	});
	return {
		subject: filled.subject,
		heading: filled.heading,
		paragraphs: [...filled.paragraphs, ...filled.closing]
	};
}

const inviterOrSomeone = (inviterName: string | undefined) =>
	inviterName ?? m.emailTeamInvitationUnknownInviter();

export interface TeamInvitationEmailValues {
	recipientEmail: string;
	conferenceTitle: string;
	role: TeamRole;
	/** Absent when the inviter's account is gone. */
	inviterName?: string;
	inviteUrl: string;
	expiresAt: Date;
}

/** Renders an invitation in `locale`, in `own` words and with `footer` where given. */
export function renderTeamInvitationEmail({
	values,
	locale,
	own,
	footer
}: {
	values: TeamInvitationEmailValues;
	locale: Locale;
	own?: EmailTextOverride | null;
	footer?: string | null;
}) {
	return runWithLocale({
		locale,
		fn: async () => {
			const expiresAt = new Intl.DateTimeFormat(locale, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'Europe/Berlin'
			}).format(values.expiresAt);
			const text = invitationText({
				locale,
				own,
				values: {
					conference: values.conferenceTitle,
					role: translateTeamRole(values.role),
					inviter: inviterOrSomeone(values.inviterName),
					date: expiresAt
				}
			});
			const { html, text: plain } = await renderEmail({
				component: TeamInvitationEmail,
				props: {
					recipientEmail: values.recipientEmail,
					conferenceTitle: values.conferenceTitle,
					heading: text.heading,
					paragraphs: text.paragraphs,
					inviteUrl: values.inviteUrl,
					conferenceFooter: emailFooterParagraphs({
						footer,
						conferenceTitle: values.conferenceTitle
					})
				}
			});
			return { subject: text.subject, html, text: plain };
		}
	});
}

export interface SendTeamInvitationEmailParams extends TeamInvitationEmailValues {
	conferenceId: string;
	invitationId: string;
	/** Who invites. */
	sentById: string;
	/** The language of the mail. */
	locale: Locale;
}

/** Sends an invitation into the team; answers why it failed, `undefined` when it went out. */
export async function sendTeamInvitationEmail({
	conferenceId,
	invitationId,
	sentById,
	locale,
	...values
}: SendTeamInvitationEmailParams) {
	const wording = await loadWording(conferenceId);
	return sendByHand({
		conferenceId,
		kind: 'TEAM_INVITATION',
		userId: null,
		subjectKey: invitationId,
		to: values.recipientEmail,
		sentById,
		render: () =>
			renderTeamInvitationEmail({
				values,
				locale,
				...wordingIn({ wording, kind: 'TEAM_INVITATION', locale })
			})
	});
}
