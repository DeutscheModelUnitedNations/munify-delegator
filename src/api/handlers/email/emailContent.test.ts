// @vitest-environment node
import { describe, expect, test } from 'vitest';
import * as schema from '#api/db/schema/index.js';
import { renderEmail, NotificationEmail } from '#lib/emails/index.js';
import { overwriteGetLocale } from '#lib/paraglide/runtime.js';
import { emailContent, recipientName } from './emailContent';
import type { DueEmail, EmailSnapshot, SnapshotPerson } from './dueEmails';

const conference: EmailSnapshot['conference'] = {
	id: 'c1',
	title: 'MUN-SH 2027',
	state: 'PREPARATION',
	assignmentReleased: true,
	unlockPostals: true,
	unlockPayments: true,
	startAssignment: new Date('2026-12-01T12:00:00Z'),
	startConference: new Date('2027-03-01T08:00:00Z'),
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

describe.each(['de', 'en'] as const)('the automatic mails in %s', (locale) => {
	test.each(schema.emailKind.enumValues)('%s has text and renders', async (kind) => {
		overwriteGetLocale(() => locale);
		const email: DueEmail = {
			kind,
			subjectKey: 'test',
			person,
			students: [person],
			student: person,
			field: 'mediaConsent'
		};
		const content = emailContent(email, conference, 'https://delegator.example.org');
		expect(content.subject).not.toBe('');
		expect(content.paragraphs.length).toBeGreaterThan(0);
		const { html, text } = await renderEmail(NotificationEmail, {
			heading: content.heading,
			recipientName: recipientName(person),
			paragraphs: content.paragraphs,
			items: content.items,
			closing: content.closing,
			button: content.button,
			conferenceTitle: conference.title
		});
		expect(html).toContain(content.heading);
		expect(text).toContain('Ada Lovelace');
		if (kind === 'ASSIGNMENT_ACCEPTED') {
			expect(text).toContain(locale === 'de' ? 'Frankreich' : 'France');
		}
	});
});
