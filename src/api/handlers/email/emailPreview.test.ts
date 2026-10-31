// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EmailSnapshot, SnapshotPerson } from './dueEmails';

const stored = vi.hoisted(() => ({
	snapshot: undefined as { conference: unknown } | undefined,
	texts: [] as { kind: string; locale: string; subject: string | null }[],
	footers: [] as { locale: string; text: string }[]
}));

vi.mock('#api/db/db', () => ({
	db: {
		query: {
			conferenceEmailText: { findMany: async () => stored.texts },
			conferenceEmailFooter: { findMany: async () => stored.footers }
		}
	},
	schema: {}
}));
vi.mock('#api/services/email/emailService', () => ({ emailService: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));
vi.mock('#api/services/requestLocale', () => ({
	localeOfUser: (locale: string | null) => locale ?? 'de',
	runWithLocale: ({ fn }: { locale: string; fn: () => unknown }) => fn()
}));
vi.mock('./emailSnapshot', () => ({ loadEmailSnapshot: async () => stored.snapshot }));
vi.mock('./teamInvitationEmail', () => ({
	renderTeamInvitationEmail: (...args: unknown[]) => ({ team: 'invitation', args })
}));

const { previewEmail } = await import('./emailSweep');

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
		expect(
			await previewEmail({
				conferenceId: 'c1',
				kind: 'PAYMENT_UNLOCKED',
				user,
				origin: 'https://app'
			})
		).toBeUndefined();
	});

	test("renders the conference's stored text and footer", async () => {
		stored.texts = [{ kind: 'PAYMENT_UNLOCKED', locale: 'de', subject: 'Stored {conference}' }];
		stored.footers = [{ locale: 'de', text: 'Stored footer' }];
		const preview = await previewEmail({
			conferenceId: 'c1',
			kind: 'PAYMENT_UNLOCKED',
			user,
			origin: 'https://app'
		});
		expect(preview?.subject).toBe('Stored MUN-SH 2027');
		expect(preview && 'html' in preview ? preview.html : '').toContain('Stored footer');
	});

	test('shows the drafts instead of what is stored', async () => {
		stored.texts = [{ kind: 'PAYMENT_UNLOCKED', locale: 'de', subject: 'Stored' }];
		stored.footers = [{ locale: 'de', text: 'Stored footer' }];
		const preview = await previewEmail({
			conferenceId: 'c1',
			kind: 'PAYMENT_UNLOCKED',
			user,
			origin: 'https://app',
			draft: { subject: 'Draft' },
			footerDraft: 'Draft footer'
		});
		expect(preview?.subject).toBe('Draft');
		const html = preview && 'html' in preview ? preview.html : '';
		expect(html).toContain('Draft footer');
		expect(html).not.toContain('Stored footer');
	});

	test('renders the team invitation with its own template', async () => {
		expect(
			await previewEmail({
				conferenceId: 'c1',
				kind: 'TEAM_INVITATION',
				user,
				origin: 'https://app'
			})
		).toMatchObject({
			team: 'invitation'
		});
	});

	test('renders the team welcome like every automatic mail, from the caller to themselves', async () => {
		const preview = await previewEmail({
			conferenceId: 'c1',
			kind: 'TEAM_WELCOME',
			user,
			origin: 'https://app'
		});
		expect(preview?.subject).toContain('MUN-SH 2027');
		const html = preview && 'html' in preview ? preview.html : '';
		expect(html).toContain('Ada Lovelace hat Sie zum Team');
		expect(html).toContain('https://app/dashboard/c1');
	});
});
