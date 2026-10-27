// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EmailSnapshot, SnapshotPerson } from './dueEmails';

const stored = vi.hoisted(() => ({
	snapshot: undefined as { conference: unknown } | undefined,
	texts: [] as { kind: string; locale: string; subject: string | null }[],
	footers: [] as { locale: string; text: string }[]
}));

vi.mock('#api/db/db.js', () => ({
	db: {
		query: {
			conferenceEmailText: { findMany: async () => stored.texts },
			conferenceEmailFooter: { findMany: async () => stored.footers }
		}
	},
	schema: {}
}));
vi.mock('#api/services/email/emailService.js', () => ({ emailService: {} }));
vi.mock('#api/pubsub.js', () => ({ emailLogPubsub: { updated: () => undefined } }));
vi.mock('#api/services/requestLocale.js', () => ({
	localeOfUser: (locale: string | null) => locale ?? 'de',
	runWithLocale: (_locale: string, fn: () => unknown) => fn()
}));
vi.mock('./emailSnapshot', () => ({ loadEmailSnapshot: async () => stored.snapshot }));
vi.mock('#api/services/email/sendTeamInvitationEmail.js', () => ({
	renderTeamInvitationEmail: (...args: unknown[]) => ({ team: 'invitation', args }),
	renderTeamWelcomeEmail: (...args: unknown[]) => ({ team: 'welcome', args })
}));

const { previewEmail } = await import('./emailSweep');

const conference: EmailSnapshot['conference'] = {
	id: 'c1',
	title: 'MUN-SH 2027',
	state: 'PREPARATION',
	assignmentReleased: true,
	unlockPostals: true,
	unlockPayments: true,
	startAssignment: new Date('2026-12-01T12:00:00Z'),
	startConference: new Date('2027-03-01T08:00:00Z'),
	timezone: 'Europe/Berlin',
	certificateAvailable: true
};

const user: SnapshotPerson['user'] = {
	id: 'u1',
	email: 'ada@example.org',
	givenName: 'Ada',
	familyName: 'Lovelace',
	locale: 'de',
	birthday: null
};

beforeEach(() => {
	stored.snapshot = { conference };
	stored.texts = [];
	stored.footers = [];
});

describe('previewEmail', () => {
	test('is nothing for a conference without a snapshot', async () => {
		stored.snapshot = undefined;
		expect(await previewEmail('c1', 'PAYMENT_UNLOCKED', user, 'https://app')).toBeUndefined();
	});

	test("renders the conference's stored text and footer", async () => {
		stored.texts = [{ kind: 'PAYMENT_UNLOCKED', locale: 'de', subject: 'Stored {conference}' }];
		stored.footers = [{ locale: 'de', text: 'Stored footer' }];
		const preview = await previewEmail('c1', 'PAYMENT_UNLOCKED', user, 'https://app');
		expect(preview?.subject).toBe('Stored MUN-SH 2027');
		expect(preview && 'html' in preview ? preview.html : '').toContain('Stored footer');
	});

	test('shows the drafts instead of what is stored', async () => {
		stored.texts = [{ kind: 'PAYMENT_UNLOCKED', locale: 'de', subject: 'Stored' }];
		stored.footers = [{ locale: 'de', text: 'Stored footer' }];
		const preview = await previewEmail(
			'c1',
			'PAYMENT_UNLOCKED',
			user,
			'https://app',
			{ subject: 'Draft' },
			'Draft footer'
		);
		expect(preview?.subject).toBe('Draft');
		const html = preview && 'html' in preview ? preview.html : '';
		expect(html).toContain('Draft footer');
		expect(html).not.toContain('Stored footer');
	});

	test('renders the team mails with their own templates', async () => {
		expect(await previewEmail('c1', 'TEAM_INVITATION', user, 'https://app')).toMatchObject({
			team: 'invitation'
		});
		expect(await previewEmail('c1', 'TEAM_WELCOME', user, 'https://app')).toMatchObject({
			team: 'welcome'
		});
	});
});
