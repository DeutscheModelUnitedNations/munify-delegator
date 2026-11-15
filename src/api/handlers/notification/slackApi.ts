import { z } from 'zod';
import { SLACK_API_URL } from '$app/env/private';

/**
 * The few calls of Slack's Web API the notifications need, with a bot token: who the token is
 * (`auth.test`), who an address is in the workspace (`users.lookupByEmail`, scope
 * `users:read.email`) and a direct message to them (`chat.postMessage` to their user id, scope
 * `chat:write`).
 */

const TIMEOUT_MS = 10_000;

const answerSchema = z.looseObject({ ok: z.boolean(), error: z.string().optional() });

/** Slack refused a call; `code` is its error string (`invalid_auth`, `users_not_found`, …). */
export class SlackApiError extends Error {
	constructor(
		readonly method: string,
		readonly code: string
	) {
		super(`Slack ${method} failed: ${code}`);
		this.name = 'SlackApiError';
	}
}

async function call<T extends z.ZodType>({
	token,
	method,
	params,
	schema
}: {
	token: string;
	method: string;
	params: Record<string, string>;
	schema: T;
}): Promise<z.infer<T>> {
	const response = await fetch(`${SLACK_API_URL}/${method}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
		body: new URLSearchParams(params),
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) throw new SlackApiError(method, `http_${response.status}`);
	const body: unknown = await response.json();
	const answer = answerSchema.parse(body);
	if (!answer.ok) throw new SlackApiError(method, answer.error ?? 'unknown_error');
	return schema.parse(body);
}

/** The workspace a token writes into. Throws `SlackApiError` for a token Slack does not know. */
export async function slackWorkspaceOf(token: string) {
	const answer = await call({
		token,
		method: 'auth.test',
		params: {},
		schema: z.looseObject({ team_id: z.string(), team: z.string() })
	});
	return { teamId: answer.team_id, teamName: answer.team };
}

/** The workspace's user id of an address, or null when nobody there has it. */
export async function slackUserIdOfEmail({ token, email }: { token: string; email: string }) {
	try {
		const answer = await call({
			token,
			method: 'users.lookupByEmail',
			params: { email },
			schema: z.looseObject({ user: z.looseObject({ id: z.string() }) })
		});
		return answer.user.id;
	} catch (error) {
		if (error instanceof SlackApiError && error.code === 'users_not_found') return null;
		throw error;
	}
}

/** A direct message from the bot to a user of its workspace. `text` is Slack's mrkdwn. */
export async function sendSlackDirectMessage({
	token,
	slackUserId,
	text
}: {
	token: string;
	slackUserId: string;
	text: string;
}) {
	await call({
		token,
		method: 'chat.postMessage',
		params: { channel: slackUserId, text, unfurl_links: 'false' },
		schema: answerSchema
	});
}
