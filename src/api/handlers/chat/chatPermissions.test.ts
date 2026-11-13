import { describe, expect, test, vi } from 'vitest';
import type { Context } from '#api/context';
import { createCallerFactsCache } from '#api/services/authHelper/callerFactsCache';
import type { CallerFacts } from '#api/services/authHelper/callerFacts';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
const hasAcceptedTerms = vi.fn<(userId: string) => Promise<boolean>>();
vi.mock('./chatService', () => ({ hasAcceptedTerms }));

const { assertAcceptedTerms, caresFor, chatSide, holdsInbox, knowsPeopleOf, writingParticipantId } =
	await import('./chatPermissions');
const { NO_CALLER_FACTS } = await import('#api/services/authHelper/callerFacts');

/** Just enough of a request context for the checks, which read only these parts. */
function contextFor({
	sub,
	admin = false,
	mcp
}: {
	sub: string;
	admin?: boolean;
	mcp?: Context['mcp'];
}): Context {
	const user = { sub, email: `${sub}@example.org`, OIDCRoleNames: [], hasRole: () => false };
	const ctx: Pick<Context, 'hasRole' | 'oidc' | 'mcp' | 'callerFactsCache' | 'mustBeLoggedIn'> = {
		mcp,
		hasRole: (role) => admin && role === 'admin',
		callerFactsCache: createCallerFactsCache(),
		mustBeLoggedIn: () => user,
		oidc: { user, claims: {}, impersonator: undefined }
	};
	// TYPE-SAFETY-EXCEPTION: the checks never touch the rest of the context (the request event),
	// and building a real RequestEvent here would test SvelteKit, not them.
	return ctx as Context;
}

const facts = (parts: Partial<CallerFacts> = {}): CallerFacts => ({ ...NO_CALLER_FACTS, ...parts });

const chat = {
	kind: 'DIRECT' as const,
	conferenceId: 'c1',
	participantId: 'p-a',
	otherParticipantId: 'p-b',
	delegationId: null,
	inbox: null,
	committeeId: null,
	trustedUserId: null
};
const teamChat = {
	...chat,
	kind: 'TEAM' as const,
	otherParticipantId: null,
	inbox: 'CHAIR' as const,
	committeeId: 'ga'
};

const delegate = facts({
	participants: [{ id: 'p-a', conferenceId: 'c1', registered: true }],
	delegationMemberships: [
		{ id: 'm1', delegationId: 'd1', conferenceId: 'c1', isHeadDelegate: false, applied: true }
	]
});
const care = facts({ team: [{ conferenceId: 'c1', roles: ['PARTICIPANT_CARE'] }] });
const chair = facts({
	team: [{ conferenceId: 'c1', roles: ['MEMBER'] }],
	teamFunctions: [{ conferenceId: 'c1', committeeId: 'ga', kind: 'CHAIR' }]
});

describe('chatSide', () => {
	test('a party of a direct chat is a participant in it', () => {
		expect(chatSide({ ctx: contextFor({ sub: 'u' }), facts: delegate, chat })).toBe('PARTICIPANT');
	});

	test('a member is a participant of their delegation group, nobody else is', () => {
		const group = {
			...chat,
			kind: 'DELEGATION' as const,
			participantId: null,
			otherParticipantId: null
		};
		const ctx = contextFor({ sub: 'u' });
		expect(chatSide({ ctx, facts: delegate, chat: { ...group, delegationId: 'd1' } })).toBe(
			'PARTICIPANT'
		);
		expect(chatSide({ ctx, facts: delegate, chat: { ...group, delegationId: 'd2' } })).toBe(
			'REVIEW'
		);
	});

	test('whoever holds the function answers its inbox', () => {
		const ctx = contextFor({ sub: 'u' });
		expect(chatSide({ ctx, facts: chair, chat: teamChat })).toBe('TEAM');
		expect(chatSide({ ctx, facts: chair, chat: { ...teamChat, inbox: 'CONSULTANT' } })).toBe(
			'REVIEW'
		);
		expect(chatSide({ ctx, facts: chair, chat: { ...teamChat, committeeId: 'sc' } })).toBe(
			'REVIEW'
		);
	});

	test('participant care answers its own inbox and only reviews the others', () => {
		const ctx = contextFor({ sub: 'u' });
		expect(
			chatSide({
				ctx,
				facts: care,
				chat: { ...teamChat, inbox: 'PARTICIPANT_CARE', committeeId: null }
			})
		).toBe('TEAM');
		expect(chatSide({ ctx, facts: care, chat: teamChat })).toBe('REVIEW');
		expect(chatSide({ ctx, facts: care, chat })).toBe('REVIEW');
	});

	test('the participant of a team chat stays a participant, even with a function elsewhere', () => {
		const both = facts({ ...delegate, teamFunctions: chair.teamFunctions });
		expect(chatSide({ ctx: contextFor({ sub: 'u' }), facts: both, chat: teamChat })).toBe(
			'PARTICIPANT'
		);
	});
});

describe('holdsInbox', () => {
	const inbox = { conferenceId: 'c1', inbox: 'PARTICIPANT_CARE' as const, committeeId: null };

	test('participant care holds the care inbox of its own conferences only', () => {
		const ctx = contextFor({ sub: 'u' });
		expect(holdsInbox({ ctx, facts: care, ...inbox })).toBe(true);
		expect(holdsInbox({ ctx, facts: care, ...inbox, conferenceId: 'c2' })).toBe(false);
		expect(holdsInbox({ ctx, facts: chair, ...inbox })).toBe(false);
	});

	test('a system admin answers every inbox, but not through an assistant', () => {
		expect(
			holdsInbox({ ctx: contextFor({ sub: 'u', admin: true }), facts: facts(), ...inbox })
		).toBe(true);
		const assistant = contextFor({
			sub: 'u',
			admin: true,
			mcp: { conferenceId: 'c1', isAdmin: true }
		});
		expect(holdsInbox({ ctx: assistant, facts: facts(), ...inbox })).toBe(false);
	});
});

describe('caresFor', () => {
	test('only participant care learns the names behind the roles', () => {
		const ctx = contextFor({ sub: 'u' });
		expect(caresFor({ ctx, facts: care, conferenceId: 'c1' })).toBe(true);
		expect(caresFor({ ctx, facts: chair, conferenceId: 'c1' })).toBe(false);
		expect(caresFor({ ctx, facts: delegate, conferenceId: 'c1' })).toBe(false);
	});
});

describe('writingParticipantId', () => {
	test('delegates and single participants write, supervisors do not', () => {
		const ctx = contextFor({ sub: 'u' });
		expect(writingParticipantId({ ctx, facts: delegate, conferenceId: 'c1' })).toBe('p-a');
		const supervisor = facts({
			participants: [{ id: 'p-s', conferenceId: 'c1', registered: true }],
			supervisorRegistrations: [{ id: 's1', conferenceId: 'c1' }]
		});
		expect(writingParticipantId({ ctx, facts: supervisor, conferenceId: 'c1' })).toBeUndefined();
		expect(writingParticipantId({ ctx, facts: delegate, conferenceId: 'c2' })).toBeUndefined();
	});

	test('an assistant writes for nobody', () => {
		const assistant = contextFor({ sub: 'u', mcp: { conferenceId: 'c1', isAdmin: false } });
		expect(
			writingParticipantId({ ctx: assistant, facts: delegate, conferenceId: 'c1' })
		).toBeUndefined();
	});
});

describe('trusted persons', () => {
	const trustedInbox = {
		conferenceId: 'c1',
		inbox: 'TRUSTED_PERSON' as const,
		committeeId: null
	};
	const trusted = facts({
		team: [{ conferenceId: 'c1', roles: ['MEMBER'] }],
		teamFunctions: [{ conferenceId: 'c1', committeeId: null, kind: 'TRUSTED_PERSON' }]
	});
	const anna = contextFor({ sub: 'anna' });

	test('answer the inbox written to all of them, in their conference', () => {
		expect(holdsInbox({ ctx: anna, facts: trusted, ...trustedInbox })).toBe(true);
		expect(holdsInbox({ ctx: anna, facts: trusted, ...trustedInbox, conferenceId: 'c2' })).toBe(
			false
		);
	});

	test('answer a chat written to them alone, not one written to another', () => {
		expect(holdsInbox({ ctx: anna, facts: trusted, ...trustedInbox, trustedUserId: 'anna' })).toBe(
			true
		);
		expect(holdsInbox({ ctx: anna, facts: trusted, ...trustedInbox, trustedUserId: 'ben' })).toBe(
			false
		);
	});

	test('are the only ones: not participant care, not a system admin, not an assistant', () => {
		expect(holdsInbox({ ctx: contextFor({ sub: 'u' }), facts: care, ...trustedInbox })).toBe(false);
		expect(
			holdsInbox({ ctx: contextFor({ sub: 'root', admin: true }), facts: facts(), ...trustedInbox })
		).toBe(false);
		const assistant = contextFor({ sub: 'anna', mcp: { conferenceId: 'c1', isAdmin: false } });
		expect(holdsInbox({ ctx: assistant, facts: trusted, ...trustedInbox })).toBe(false);
	});

	test('answer nothing else by being trusted', () => {
		expect(
			holdsInbox({
				ctx: anna,
				facts: trusted,
				conferenceId: 'c1',
				inbox: 'PARTICIPANT_CARE',
				committeeId: null
			})
		).toBe(false);
		expect(
			holdsInbox({
				ctx: anna,
				facts: trusted,
				conferenceId: 'c1',
				inbox: 'CHAIR',
				committeeId: 'ga'
			})
		).toBe(false);
	});

	test('take the team side of their chats', () => {
		const shared = { ...teamChat, inbox: 'TRUSTED_PERSON' as const, committeeId: null };
		expect(chatSide({ ctx: anna, facts: trusted, chat: shared })).toBe('TEAM');
		expect(
			chatSide({ ctx: anna, facts: trusted, chat: { ...shared, trustedUserId: 'anna' } })
		).toBe('TEAM');
	});

	test('nobody learns who the participant is there, not even participant care', () => {
		const ctx = contextFor({ sub: 'u' });
		const both = facts({ ...care, teamFunctions: trusted.teamFunctions });
		expect(
			knowsPeopleOf({ ctx, facts: both, chat: { conferenceId: 'c1', inbox: 'TRUSTED_PERSON' } })
		).toBe(false);
		expect(
			knowsPeopleOf({ ctx, facts: both, chat: { conferenceId: 'c1', inbox: 'PARTICIPANT_CARE' } })
		).toBe(true);
		expect(
			knowsPeopleOf({ ctx, facts: trusted, chat: { conferenceId: 'c1', inbox: 'CHAIR' } })
		).toBe(false);
	});
});

describe('assertAcceptedTerms', () => {
	test('lets through who accepted the terms as they stand', async () => {
		hasAcceptedTerms.mockResolvedValueOnce(true);
		await expect(assertAcceptedTerms('u1')).resolves.toBeUndefined();
		expect(hasAcceptedTerms).toHaveBeenCalledWith('u1');
	});

	test('refuses anybody else with a code the composer recognises', async () => {
		hasAcceptedTerms.mockResolvedValueOnce(false);
		await expect(assertAcceptedTerms('u1')).rejects.toMatchObject({
			extensions: { code: 'TERMS_NOT_ACCEPTED' }
		});
	});
});
