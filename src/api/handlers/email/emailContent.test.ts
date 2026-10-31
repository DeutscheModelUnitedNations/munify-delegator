// @vitest-environment node
import { describe, expect, test } from 'vitest';
import * as schema from '#api/db/schema/index';
import { renderEmail, NotificationEmail } from './templates/index';
import { overwriteGetLocale } from '#lib/paraglide/runtime';
import { emailContent, recipientName } from './emailContent';
import type { AutomaticEmailKind, DueEmail, EmailSnapshot, SnapshotPerson } from './dueEmails';
import { isAlwaysSent } from '#lib/helpers/emailKinds';

const automaticKinds = schema.emailKind.enumValues.filter(
	(kind): kind is AutomaticEmailKind => !isAlwaysSent(kind)
);

const conference: EmailSnapshot['conference'] = {
	id: 'c1',
	title: 'MUN-SH 2027',
	state: 'PREPARATION',
	assignmentReleased: true,
	unlockPostals: true,
	unlockPayments: true,
	applicationDeadline: new Date('2026-12-01T12:00:00Z'),
	startConference: new Date('2027-03-01T08:00:00Z'),
	timezone: 'Europe/Berlin',
	certificateAvailable: true
};

const person: SnapshotPerson = {
	participantId: 'p1',
	user: {
		id: 'u1',
		email: 'ada@example.org',
		givenName: 'Ada',
		familyName: 'Lovelace',
		locale: 'de',
		birthday: null
	},
	paymentStatus: 'PENDING',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	didAttend: true,
	delegation: {
		applied: true,
		role: { id: 'r1', kind: 'NATION', name: null, nationAlpha3Code: 'FRA' },
		committee: 'GV'
	},
	single: null,
	supervisor: null,
	seatedFromWaitingList: null
};

/** A due mail of `kind` with everything any kind may need filled in. */
function dueEmailOf(kind: AutomaticEmailKind): DueEmail {
	return {
		kind,
		subjectKey: 'test',
		recipient: person.user,
		person,
		teamMember: {
			id: 'tm1',
			role: 'PARTICIPANT_CARE',
			user: person.user,
			inviterName: 'Robin Reviewer'
		},
		students: [person],
		student: person,
		field: 'mediaConsent',
		review: {
			id: 'review-1',
			authorParticipantId: 'p1',
			paperId: 'paper-1',
			paperType: 'POSITION_PAPER',
			agendaItem: 'GV: Klimaschutz',
			reviewer: { name: 'Robin Reviewer', email: 'robin@example.org' },
			statusAfter: 'ACCEPTED'
		},
		survey: {
			id: 'survey-1',
			title: 'Workshop-Wahl',
			deadline: new Date('2027-02-01T17:00:00Z'),
			answeredBy: []
		}
	};
}

type Content = ReturnType<typeof emailContent>;
const bodyOf = (content: Content) => content.paragraphs.join('\n');

/** What a kind's mail has to say beyond having text, per locale. */
const kindChecks: Partial<
	Record<
		AutomaticEmailKind,
		(args: { content: Content; text: string; locale: 'de' | 'en' }) => void
	>
> = {
	ASSIGNMENT_ACCEPTED: ({ text, locale }) => {
		expect(text).toContain(locale === 'de' ? 'Frankreich' : 'France');
	},
	SURVEY_REMINDER: ({ content }) => {
		expect(content.subject).toContain('Workshop-Wahl');
		// 17:00 UTC is 18:00 in Berlin, the conference's time zone
		expect(bodyOf(content)).toMatch(/18:00|6:00\s?PM/);
	},
	TEAM_WELCOME: ({ content, locale }) => {
		expect(bodyOf(content)).toContain('Robin Reviewer');
		expect(bodyOf(content)).toContain(
			locale === 'de' ? 'Teilnehmendenbetreuung' : 'Participant Care'
		);
		expect(content.button?.url).toBe('https://delegator.example.org/dashboard/c1');
	},
	PAPER_REVIEWED: ({ content, locale }) => {
		expect(content.subject).toContain('GV: Klimaschutz');
		expect(bodyOf(content)).toContain('Robin Reviewer (robin@example.org)');
		expect(bodyOf(content)).toContain(locale === 'de' ? 'Akzeptiert' : 'Accepted');
		expect(content.button?.url).toBe('https://delegator.example.org/dashboard/c1/paperhub/paper-1');
	}
};

describe.each(['de', 'en'] as const)('the automatic mails in %s', (locale) => {
	test.each(automaticKinds)('%s has text and renders', async (kind) => {
		overwriteGetLocale(() => locale);
		const content = emailContent({
			email: dueEmailOf(kind),
			conference,
			origin: 'https://delegator.example.org'
		});
		expect(content.subject).not.toBe('');
		expect(content.paragraphs.length).toBeGreaterThan(0);
		const { html, text } = await renderEmail({
			component: NotificationEmail,
			props: {
				heading: content.heading,
				recipientName: recipientName(person.user),
				paragraphs: content.paragraphs,
				items: content.items,
				closing: content.closing,
				button: content.button,
				conferenceTitle: conference.title
			}
		});
		expect(html).toContain(content.heading);
		expect(text).toContain('Ada Lovelace');
		kindChecks[kind]?.({ content, text, locale });
		// Only a review's mail goes back to someone: the reviewer.
		expect(content.replyTo).toBe(kind === 'PAPER_REVIEWED' ? 'robin@example.org' : undefined);
	});
});
