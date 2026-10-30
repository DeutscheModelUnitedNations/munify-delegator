// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));

const { renderTeamInvitationEmail, renderTeamWelcomeEmail } =
	await import('./sendTeamInvitationEmail');

const invitation = {
	recipientEmail: 'new@example.org',
	conferenceTitle: 'MUN-SH 2027',
	role: 'PARTICIPANT_CARE' as const,
	inviterName: 'Ada Lovelace',
	inviteUrl: 'https://delegator.example.org/auth/accept-invitation?token=abc',
	expiresAt: new Date('2027-01-15T12:00:00Z')
};

describe('the team invitation', () => {
	test('fills the default text in the language asked for', async () => {
		const mail = await renderTeamInvitationEmail(invitation, 'en');
		expect(mail.subject).toContain('MUN-SH 2027');
		expect(mail.html).toContain('Ada Lovelace');
		expect(mail.html).toContain('January 15, 2027');
		expect(mail.html).toContain(invitation.inviteUrl);
	});

	test("uses the conference's own words, with the placeholders filled in", async () => {
		const mail = await renderTeamInvitationEmail(invitation, 'de', {
			subject: 'Komm ins Team von {conference}',
			body: '{inviter} möchte dich als {role} dabeihaben. Bis {date}!'
		});
		expect(mail.subject).toBe('Komm ins Team von MUN-SH 2027');
		expect(mail.html).toContain('Ada Lovelace möchte dich als');
		expect(mail.html).toContain('15. Januar 2027');
		// the heading it left alone stays the default
		expect(mail.html).toContain('Einladung ins Organisationsteam');
	});

	test("carries the conference's footer", async () => {
		const mail = await renderTeamInvitationEmail(invitation, 'en', null, 'Your {conference} team');
		expect(mail.html).toContain('Your MUN-SH 2027 team');
		expect((await renderTeamInvitationEmail(invitation, 'en')).html).not.toContain('team</p>');
	});

	test('names somebody when the inviter is gone', async () => {
		const mail = await renderTeamInvitationEmail({ ...invitation, inviterName: undefined }, 'de');
		expect(mail.html).toContain('Ein Teammitglied');
	});
});

describe('the team welcome', () => {
	test('greets the person by name and links to the dashboard', async () => {
		const mail = await renderTeamWelcomeEmail(
			{
				recipientName: 'Grace Hopper',
				recipientEmail: 'grace@example.org',
				conferenceTitle: 'MUN-SH 2027',
				role: 'PARTICIPANT_CARE',
				inviterName: 'Ada Lovelace',
				dashboardUrl: 'https://delegator.example.org/dashboard/c1'
			},
			'en',
			{ body: 'Hi {name}, {inviter} added you.' }
		);
		expect(mail.subject).toContain('MUN-SH 2027');
		expect(mail.html).toContain('Hi Grace Hopper, Ada Lovelace added you.');
		expect(mail.html).toContain('https://delegator.example.org/dashboard/c1');
	});
});
