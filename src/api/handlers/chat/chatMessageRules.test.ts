import { describe, expect, test, vi } from 'vitest';
import type { Context } from '#api/context';
import { createCallerFactsCache } from '#api/services/authHelper/callerFactsCache';
import type { CallerFacts } from '#api/services/authHelper/callerFacts';

/**
 * The read rules of chat messages as `registerChatAbilities` registers them, evaluated for a
 * party of a chat: whatever grants a party the text of a message must leave out the ones
 * participant care hid, and the rule for those must mask the text and who hid it why.
 */

type Rule = (ctx: Context) => unknown;
const rules = new Map<string, Rule[]>();

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({
	abilityBuilder: new Proxy(
		{},
		{
			get: (_target, table: string) => ({
				allow: (actions: string | string[]) => ({
					when: (rule: Rule) => {
						if (![actions].flat().includes('read')) return;
						rules.set(table, [...(rules.get(table) ?? []), rule]);
					}
				})
			})
		}
	)
}));
vi.mock('#api/handlers/messagingTerms/messagingTermsService', () => ({
	hasAcceptedTerms: vi.fn()
}));

const { registerChatAbilities } = await import('./chatPermissions');
const { NO_CALLER_FACTS } = await import('#api/services/authHelper/callerFacts');
registerChatAbilities();

function contextFor(facts: CallerFacts): Context {
	const user = { sub: 'u', email: 'u@example.org', OIDCRoleNames: [], hasRole: () => false };
	const cache = createCallerFactsCache();
	cache.loading = Promise.resolve(facts);
	cache.current = facts;
	const ctx: Pick<Context, 'hasRole' | 'oidc' | 'mcp' | 'callerFactsCache' | 'mustBeLoggedIn'> = {
		mcp: undefined,
		hasRole: () => false,
		callerFactsCache: cache,
		mustBeLoggedIn: () => user,
		oidc: { user, claims: {}, impersonator: undefined }
	};
	// TYPE-SAFETY-EXCEPTION: the rules read only these parts of the context.
	return ctx as Context;
}

const delegate: CallerFacts = {
	...NO_CALLER_FACTS,
	participants: [{ id: 'p-a', conferenceId: 'c1', registered: true }],
	delegationMemberships: [
		{ id: 'm1', delegationId: 'd1', conferenceId: 'c1', isHeadDelegate: false, applied: true }
	]
};

interface Grant {
	where: Record<string, unknown>;
	columns?: Record<string, boolean>;
}

function isGrant(value: unknown): value is Grant {
	return typeof value === 'object' && value !== null && 'where' in value;
}

async function grantsFor(facts: CallerFacts) {
	const ctx = contextFor(facts);
	const granted = await Promise.all((rules.get('chatMessage') ?? []).map((rule) => rule(ctx)));
	return granted.filter(isGrant);
}

/**
 * Whether a filter cannot match a row: `NOTHING`, a condition on an empty id list, a nested filter
 * that cannot, or an `OR` none of whose branches can.
 */
function matchesNothing(filter: unknown): boolean {
	if (typeof filter !== 'object' || filter === null) return false;
	const entries = Object.entries(filter);
	if (entries.length === 1 && 'RAW' in filter) return true;
	return entries.some(([key, value]) => {
		if (key === 'OR') return Array.isArray(value) && value.every(matchesNothing);
		if (typeof value !== 'object' || value === null) return false;
		if ('in' in value && Array.isArray(value.in) && value.in.length === 0) return true;
		return matchesNothing(value);
	});
}

/** Whether a filter can only match messages of chats between a participant and a team inbox. */
const onlyTeamChats = (where: Record<string, unknown>) =>
	JSON.stringify(where.chat ?? {}).includes('"kind":"TEAM"') &&
	!JSON.stringify(where.chat ?? {}).includes('"OR"');

describe('chat message read rules for a party', () => {
	test('a rule granting the text never matches a hidden message', async () => {
		const full = (await grantsFor(delegate)).filter((grant) => grant.columns?.body !== false);
		expect(full.length).toBeGreaterThan(0);
		for (const grant of full) {
			const where = grant.where;
			const excludesHidden = JSON.stringify(where.hiddenAt) === '{"isNull":true}';
			expect(excludesHidden || matchesNothing(where) || onlyTeamChats(where)).toBe(true);
		}
	});

	test('the hidden messages of their chats come without the text and who hid them why', async () => {
		const masked = (await grantsFor(delegate)).filter(
			(grant) => JSON.stringify(grant.where.hiddenAt) === '{"isNotNull":true}'
		);
		expect(masked).toHaveLength(1);
		expect(masked[0]?.columns).toEqual({
			body: false,
			hiddenById: false,
			hiddenReason: false,
			hiddenReportId: false
		});
	});
});
