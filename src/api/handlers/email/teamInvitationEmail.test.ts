// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));

const { renderTeamInvitationEmail } = await import('./teamInvitationEmail');

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
		const mail = await renderTeamInvitationEmail({ values: invitation, locale: 'en' });
		expect(mail.subject).toContain('MUN-SH 2027');
		expect(mail.html).toContain('Ada Lovelace');
		expect(mail.html).toContain('January 15, 2027');
		expect(mail.html).toContain(invitation.inviteUrl);
	});

	test("uses the conference's own words, with the placeholders filled in", async () => {
		const mail = await renderTeamInvitationEmail({
			values: invitation,
			locale: 'de',
			own: {
				subject: 'Komm ins Team von {conference}',
				body: '{inviter} möchte dich als {role} dabeihaben. Bis {date}!'
			}
		});
		expect(mail.subject).toBe('Komm ins Team von MUN-SH 2027');
		expect(mail.html).toContain('Ada Lovelace möchte dich als');
		expect(mail.html).toContain('15. Januar 2027');
		// the heading it left alone stays the default
		expect(mail.html).toContain('Einladung ins Organisationsteam');
	});

	test("carries the conference's footer", async () => {
		const mail = await renderTeamInvitationEmail({
			values: invitation,
			locale: 'en',
			own: null,
			footer: 'Your {conference} team'
		});
		expect(mail.html).toContain('Your MUN-SH 2027 team');
		expect(
			(await renderTeamInvitationEmail({ values: invitation, locale: 'en' })).html
		).not.toContain('team</p>');
	});

	test('names somebody when the inviter is gone', async () => {
		const mail = await renderTeamInvitationEmail({
			values: { ...invitation, inviterName: undefined },
			locale: 'de'
		});
		expect(mail.html).toContain('Ein Teammitglied');
	});
});
