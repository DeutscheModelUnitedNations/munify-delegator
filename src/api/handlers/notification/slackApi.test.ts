// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ SLACK_API_URL: 'https://slack.test/api' }));

const { SlackApiError, sendSlackDirectMessage, slackEscape, slackUserIdOfEmail, slackWorkspaceOf } =
	await import('./slackApi');

const answer = (body: unknown, status = 200) =>
	vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body, { status }));

afterEach(() => vi.restoreAllMocks());

describe('slackEscape', () => {
	test("escapes Slack's control characters and nothing else", () => {
		expect(slackEscape('Klima <2°C> & "mehr"')).toBe('Klima &lt;2°C&gt; &amp; "mehr"');
		expect(slackEscape('&lt;')).toBe('&amp;lt;');
	});
});

describe('the Slack calls', () => {
	test('ask with the bot token as bearer and form parameters', async () => {
		const fetched = answer({ ok: true, user: { id: 'U1' } });
		await slackUserIdOfEmail({ token: 'xoxb-1', email: 'a@example.org' });
		const [url, init] = fetched.mock.calls[0] ?? [];
		expect(url).toBe('https://slack.test/api/users.lookupByEmail');
		expect(new Headers(init?.headers).get('authorization')).toBe('Bearer xoxb-1');
		expect(String(init?.body)).toBe('email=a%40example.org');
	});

	test('read the workspace a token belongs to', async () => {
		answer({ ok: true, team_id: 'T1', team: 'MUN-SH', user: 'bot' });
		expect(await slackWorkspaceOf('xoxb-1')).toEqual({ teamId: 'T1', teamName: 'MUN-SH' });
	});

	test('refuse a token Slack does not know, by its error', async () => {
		answer({ ok: false, error: 'invalid_auth' });
		await expect(slackWorkspaceOf('xoxb-nope')).rejects.toMatchObject({
			name: 'SlackApiError',
			code: 'invalid_auth'
		});
	});

	test('answer nobody for an address the workspace does not know', async () => {
		answer({ ok: false, error: 'users_not_found' });
		expect(await slackUserIdOfEmail({ token: 'xoxb-1', email: 'x@example.org' })).toBeNull();
	});

	test('do not take another failure for an unknown address', async () => {
		answer({ ok: false, error: 'missing_scope' });
		await expect(
			slackUserIdOfEmail({ token: 'xoxb-1', email: 'x@example.org' })
		).rejects.toBeInstanceOf(SlackApiError);
	});

	test('fail on an answer that is not Slack’s', async () => {
		answer('gateway timeout', 504);
		await expect(slackWorkspaceOf('xoxb-1')).rejects.toMatchObject({ code: 'http_504' });
	});

	test('send a direct message to the user id, without unfurling the link', async () => {
		const fetched = answer({ ok: true });
		await sendSlackDirectMessage({ token: 'xoxb-1', slackUserId: 'U1', text: 'Hallo' });
		const body = new URLSearchParams(String(fetched.mock.calls[0]?.[1]?.body));
		expect(Object.fromEntries(body)).toEqual({
			channel: 'U1',
			text: 'Hallo',
			unfurl_links: 'false'
		});
	});
});
