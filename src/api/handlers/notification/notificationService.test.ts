// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	CERTIFICATE_SECRET: 'x',
	SLACK_API_URL: 'https://slack.test'
}));
vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({}));

const { botTokenSchema, workspaceNameSchema } = await import('./notificationService');

describe('the workspace argument schemas', () => {
	test('take a bot token and nothing else', () => {
		expect(botTokenSchema.parse(' xoxb-12-ab-CD ')).toBe('xoxb-12-ab-CD');
		for (const other of ['xoxp-12-ab', 'xoxb-', 'token', 'xoxb-12 34']) {
			expect(botTokenSchema.safeParse(other).success).toBe(false);
		}
	});

	test('want a name of a sensible length', () => {
		expect(workspaceNameSchema.parse('  MUN-SH ')).toBe('MUN-SH');
		expect(workspaceNameSchema.safeParse('   ').success).toBe(false);
		expect(workspaceNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
	});
});
