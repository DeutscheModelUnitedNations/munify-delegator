import { localeOfUser } from '#api/services/requestLocale';
import { m } from '#lib/paraglide/messages';
import { isAlwaysSent } from '#lib/helpers/emailKinds';
import { getInvitationExpiryDate } from '#api/handlers/teamMemberInvitation/invitationToken';
import type { DueEmail, EmailKind, EmailSnapshot, SnapshotPerson, SnapshotUser } from './dueEmails';
import { loadEmailSnapshot } from './emailSnapshot';
import type { EmailTextOverride } from './emailText';
import { renderBadgeFoundEmail } from './badgeFoundEmail';
import { renderTeamInvitationEmail } from './teamInvitationEmail';
import {
	loadWording,
	renderAutomaticEmail,
	wordingIn,
	type ConferenceWording
} from './emailDelivery';

/** A mail of `kind` as the conference would send it, addressed to `user` with made-up details. */
export async function previewEmail({
	conferenceId,
	kind,
	user,
	origin,
	draft,
	footerDraft
}: {
	conferenceId: string;
	kind: EmailKind;
	user: SnapshotUser;
	origin: string;
	draft?: EmailTextOverride;
	footerDraft?: string;
}) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot) return undefined;
	const locale = localeOfUser(user.locale);
	const stored = await loadWording(conferenceId);
	const wording: ConferenceWording = {
		texts: draft ? [{ kind, locale, ...draft }] : stored.texts,
		footers: footerDraft === undefined ? stored.footers : [{ locale, text: footerDraft }]
	};
	if (kind === 'BADGE_FOUND')
		return renderBadgeFoundEmail({
			recipient: user,
			conferenceTitle: snapshot.conference.title,
			wording
		});
	if (isAlwaysSent(kind))
		return previewInvitationEmail({ conference: snapshot.conference, user, origin, wording });
	const sample = (person: Partial<SnapshotPerson> & { user: SnapshotUser }): SnapshotPerson => ({
		participantId: person.user.id,
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		didAttend: true,
		delegation: {
			applied: true,
			role: { id: 'sample', kind: 'NATION', name: null, nationAlpha3Code: 'FRA' },
			committee: 'GV'
		},
		single: null,
		supervisor: null,
		seatedFromWaitingList: null,
		...person
	});
	const student = sample({
		user: { ...user, id: 'sample-student', givenName: 'Alex', familyName: 'Beispiel' }
	});
	const rejectedStudent = sample({
		user: { ...user, id: 'sample-student-2', givenName: 'Kim', familyName: 'Muster' },
		delegation: { applied: true, role: null, committee: null }
	});
	const email: DueEmail = {
		kind,
		subjectKey: 'preview',
		recipient: user,
		person: sample({ user }),
		teamMember: {
			id: 'preview',
			role: 'PARTICIPANT_CARE',
			user,
			inviterName: `${user.givenName} ${user.familyName}`
		},
		students: [student, rejectedStudent],
		student,
		field: 'termsAndConditions',
		review: {
			id: 'preview',
			authorParticipantId: user.id,
			paperId: 'preview',
			paperType: 'POSITION_PAPER',
			agendaItem: 'GV: Klimaschutz',
			reviewer: { name: 'Robin Beispiel', email: 'reviewer@example.org' },
			statusAfter: 'CHANGES_REQUESTED'
		},
		survey: {
			id: 'preview',
			title: m.emailPreviewSurveyTitle({}, { locale }),
			deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
			answeredBy: []
		}
	};
	return renderAutomaticEmail({ email, conference: snapshot.conference, origin, wording });
}

/** The team invitation as the conference would send it, to `user` from themselves, with a made-up link. */
function previewInvitationEmail({
	conference,
	user,
	origin,
	wording
}: {
	conference: EmailSnapshot['conference'];
	user: SnapshotUser;
	origin: string;
	wording: ConferenceWording;
}) {
	const locale = localeOfUser(user.locale);
	return renderTeamInvitationEmail({
		values: {
			recipientEmail: user.email,
			conferenceTitle: conference.title,
			role: 'PARTICIPANT_CARE',
			inviterName: `${user.givenName} ${user.familyName}`,
			inviteUrl: `${origin}/auth/accept-invitation?token=preview`,
			expiresAt: getInvitationExpiryDate()
		},
		locale,
		...wordingIn({ wording, kind: 'TEAM_INVITATION', locale })
	});
}
