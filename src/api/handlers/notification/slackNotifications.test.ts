// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({
	db: {},
	schema: { slackNotification: { subjectId: 'subject_id' } }
}));
vi.mock('./notificationStore', () => ({}));
vi.mock('./slackApi', () => ({ slackEscape: (text: string) => text }));
vi.mock('./slackToken', () => ({}));
vi.mock('./slackUsers', () => ({}));
vi.mock('#api/handlers/email/scanProblemEmail', () => ({}));
vi.mock('#api/handlers/email/paperSubmittedEmail', () => ({}));

const { groupSlackText, inboxSlackText } = await import('./slackNotifications');

const at = { conferenceTitle: 'MUN-SH', conferenceId: 'c1', origin: 'https://app' };

describe('the Slack texts of the groups and role inboxes', () => {
	test("names a committee's group by its abbreviation and a role's by its name", () => {
		const committee = groupSlackText({
			...at,
			held: { kind: 'CHAIR', committee: { abbreviation: 'GV' } }
		});
		expect(committee).toContain('*GV*');
		expect(committee).toContain('https://app/dashboard/c1/team/messages');
		expect(
			groupSlackText({ ...at, held: { kind: 'ROLE_SUPPORT', role: { name: 'Presse' } } })
		).toContain('*Presse*');
		expect(groupSlackText({ ...at, held: undefined })).toContain('MUN-SH');
	});

	test("names a role's inbox after the role", () => {
		expect(
			inboxSlackText({
				...at,
				key: { topic: 'ROLE_INBOX', teamFunctionId: 'f' },
				held: { kind: 'ROLE_SUPPORT', role: { name: 'Presse' } }
			})
		).toContain('Betreuung Presse');
	});
});
