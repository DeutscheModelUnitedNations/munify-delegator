import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import type { Context } from '#api/context';
import {
	assertTeamPermission,
	hop,
	idIn,
	isSystemAdmin,
	isTeamMemberOfConference,
	NOTHING,
	ownParticipantIds,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	teamConferenceIds,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { callerFacts, liveWhere, type CallerFacts } from '#api/services/authHelper/callerFacts';
import { callerUserId } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import type { ChatInbox, ChatSide } from '#lib/helpers/chat';
import { hasAcceptedTerms, type ChatRow } from './chatService';

/**
 * Who reads which chat. A chat is read by its parties: the two people of a direct chat, the
 * members of the delegation of a group, the participant of a team chat. A team chat is also read
 * by whoever holds its inbox: participant care (and project management) the care inbox, the
 * holders of a committee function (`teamFunction`) the chairs' or consultants' inbox of that
 * committee. Participant care reads a chat between participants only while a report is open
 * (`underReview`). A system admin reads what the team reads, never the private chats.
 *
 * What is written to the trusted persons stays with them: their inbox is read by the trusted
 * persons of the conference (`teamFunction` `TRUSTED_PERSON`), a chat with one of them by that
 * person alone. Not by participant care, not by a system admin, not by an assistant, and nobody
 * learns the participant's name there.
 */
export function registerChatAbilities() {
	abilityBuilder.chat.allow('read').when(adminChats);
	abilityBuilder.chat.allow('read').when(liveWhere(partyOfChat));
	abilityBuilder.chat.allow('read').when(liveWhere(inboxOfChat));
	abilityBuilder.chat.allow('read').when(liveWhere(trustedChats));

	// A message is read with its chat.
	abilityBuilder.chatMessage.allow('read').when((ctx) => {
		const where = adminChats(ctx)?.where;
		return where ? { where: { chat: where } } : undefined;
	});
	abilityBuilder.chatMessage
		.allow('read')
		.when(liveWhere((args) => hop(partyOfChat(args), (chat) => ({ chat }))));
	abilityBuilder.chatMessage
		.allow('read')
		.when(liveWhere((args) => hop(inboxOfChat(args), (chat) => ({ chat }))));
	abilityBuilder.chatMessage
		.allow('read')
		.when(liveWhere((args) => hop(trustedChats(args), (chat) => ({ chat }))));

	// Reports are participant care's.
	abilityBuilder.chatReport.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.chatReport
		.allow(['read', 'update'])
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);
}

function adminChats(ctx: Context) {
	return isSystemAdmin(ctx)
		? {
				where: {
					OR: [
						{ kind: 'TEAM' as const, inbox: { ne: 'TRUSTED_PERSON' as const } },
						{ underReview: true }
					]
				}
			}
		: undefined;
}

/** Matches the chats the caller is a party of; undefined for an anonymous caller and an assistant. */
function partyOfChat(args: RuleArgs) {
	const ids = ownParticipantIds(args);
	if (!ids) return undefined;
	const delegationIds = args.facts.delegationMemberships.map(
		(membership) => membership.delegationId
	);
	return {
		OR: [
			{ participantId: idIn(ids) },
			{ otherParticipantId: idIn(ids) },
			{ kind: 'DELEGATION' as const, delegationId: idIn(delegationIds) }
		]
	};
}

function functionCommitteeIds({
	facts,
	kind
}: {
	facts: CallerFacts;
	kind: 'CHAIR' | 'CONSULTANT';
}) {
	return facts.teamFunctions.flatMap((held) =>
		held.kind === kind && held.committeeId ? [held.committeeId] : []
	);
}

/** The conferences the caller is a trusted person of. */
function trustedConferenceIds(facts: CallerFacts) {
	return facts.teamFunctions
		.filter((held) => held.kind === 'TRUSTED_PERSON')
		.map((held) => held.conferenceId);
}

/**
 * Matches the chats with the trusted persons the caller answers: the ones written to all trusted
 * persons of a conference they are one of, and the ones written to them alone. Undefined for an
 * anonymous caller and an assistant.
 */
function trustedChats({ ctx, facts }: RuleArgs) {
	const userId = callerUserId(ctx);
	if (!userId) return undefined;
	return {
		kind: 'TEAM' as const,
		inbox: 'TRUSTED_PERSON' as const,
		conferenceId: idIn(trustedConferenceIds(facts)),
		OR: [{ trustedUserId: { isNull: true as const } }, { trustedUserId: userId }]
	};
}

/** Whether the caller answers the trusted persons' inbox: all of them the shared one, each their own. */
function holdsTrustedInbox({
	ctx,
	facts,
	conferenceId,
	trustedUserId
}: RuleArgs & { conferenceId: string; trustedUserId: string | null }) {
	const userId = callerUserId(ctx);
	if (!userId || !trustedConferenceIds(facts).includes(conferenceId)) return false;
	return trustedUserId === null || trustedUserId === userId;
}

/** Matches the team chats whose inbox the caller holds, and the reported chats of the conferences they care for. */
function inboxOfChat({ ctx, facts }: RuleArgs) {
	const care = teamConferenceIds({ ctx, facts, roles: PARTICIPANT_CARE_ROLES });
	if (care === undefined) return undefined;
	// a system admin's chats are `adminChats`
	if (care === 'all') return NOTHING;
	return {
		OR: [
			{ kind: 'TEAM' as const, inbox: 'PARTICIPANT_CARE' as const, conferenceId: idIn(care) },
			{ underReview: true, conferenceId: idIn(care) },
			{
				kind: 'TEAM' as const,
				inbox: 'CHAIR' as const,
				committeeId: idIn(functionCommitteeIds({ facts, kind: 'CHAIR' }))
			},
			{
				kind: 'TEAM' as const,
				inbox: 'CONSULTANT' as const,
				committeeId: idIn(functionCommitteeIds({ facts, kind: 'CONSULTANT' }))
			}
		]
	};
}

/**
 * Whether the caller answers the inbox: participant care its own, a function's holders theirs, a
 * system admin any but the trusted persons', which only they answer.
 */
export function holdsInbox({
	ctx,
	facts,
	conferenceId,
	inbox,
	committeeId,
	trustedUserId = null
}: RuleArgs & {
	conferenceId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	/** The one trusted person a chat is with; null for their shared inbox and every other one */
	trustedUserId?: string | null;
}) {
	if (inbox === 'TRUSTED_PERSON') {
		return holdsTrustedInbox({ ctx, facts, conferenceId, trustedUserId });
	}
	const care = teamConferenceIds({ ctx, facts, roles: PARTICIPANT_CARE_ROLES });
	if (care === 'all') return true;
	if (inbox === 'PARTICIPANT_CARE') return care?.includes(conferenceId) ?? false;
	return facts.teamFunctions.some(
		(held) => held.kind === inbox && held.committeeId === committeeId
	);
}

/**
 * Whether the caller learns who the participants of a chat are: participant care of its
 * conference, except in a chat with the trusted persons, where a participant stays a role.
 */
export function knowsPeopleOf({
	ctx,
	facts,
	chat
}: RuleArgs & { chat: Pick<ChatRow, 'conferenceId' | 'inbox'> }) {
	return (
		chat.inbox !== 'TRUSTED_PERSON' && caresFor({ ctx, facts, conferenceId: chat.conferenceId })
	);
}

/** Whether the caller is participant care of the conference, who learn the names behind the roles. */
export function caresFor({ ctx, facts, conferenceId }: RuleArgs & { conferenceId: string }) {
	const care = teamConferenceIds({ ctx, facts, roles: PARTICIPANT_CARE_ROLES });
	return care === 'all' || (care?.includes(conferenceId) ?? false);
}

/**
 * The caller's own part in the conference as somebody who writes: a delegation member or a single
 * participant (supervisors take no part in the chats). Undefined otherwise.
 */
export function writingParticipantId({
	ctx,
	facts,
	conferenceId
}: RuleArgs & { conferenceId: string }) {
	if (!callerUserId(ctx)) return undefined;
	const applies =
		facts.delegationMemberships.some((membership) => membership.conferenceId === conferenceId) ||
		facts.singleParticipations.some((single) => single.conferenceId === conferenceId);
	if (!applies) return undefined;
	return facts.participants.find((participant) => participant.conferenceId === conferenceId)?.id;
}

/**
 * How the caller relates to a chat they can read: a party (`PARTICIPANT`), somebody answering its
 * inbox (`TEAM`), or participant care reading a reported chat (`REVIEW`).
 */
export function chatSide({
	ctx,
	facts,
	chat
}: RuleArgs & {
	chat: Pick<
		ChatRow,
		| 'kind'
		| 'conferenceId'
		| 'participantId'
		| 'otherParticipantId'
		| 'delegationId'
		| 'inbox'
		| 'committeeId'
		| 'trustedUserId'
	>;
}): ChatSide {
	const own = ownParticipantIds({ ctx, facts }) ?? [];
	const isParty =
		(chat.participantId !== null && own.includes(chat.participantId)) ||
		(chat.otherParticipantId !== null && own.includes(chat.otherParticipantId)) ||
		(chat.kind === 'DELEGATION' &&
			own.length > 0 &&
			facts.delegationMemberships.some(
				(membership) => membership.delegationId === chat.delegationId
			));
	if (isParty) return 'PARTICIPANT';
	if (
		chat.kind === 'TEAM' &&
		chat.inbox &&
		holdsInbox({
			ctx,
			facts,
			conferenceId: chat.conferenceId,
			inbox: chat.inbox,
			committeeId: chat.committeeId,
			trustedUserId: chat.trustedUserId
		})
	) {
		return 'TEAM';
	}
	return 'REVIEW';
}

/** The caller's participant row in a conference, if they have one. */
function participantIdIn({ facts, conferenceId }: { facts: CallerFacts; conferenceId: string }) {
	const own = facts.participants.find((participant) => participant.conferenceId === conferenceId);
	return own ? own.id : null;
}

/** The chat as far as the caller reads it (NOT_FOUND otherwise), with their side of it. */
export async function readableChat({ ctx, id }: { ctx: ApiContext; id: string }) {
	const userId = ctx.mustBeLoggedIn().sub;
	const chat = await db.query.chat.findFirst(
		(await ctx.abilities.chat.filter('read')).merge({ where: { id } }).query.single
	);
	if (!chat) throw apiError({ code: 'NOT_FOUND', message: m.chatNotFound() });
	const facts = await callerFacts(ctx);
	const side = chatSide({ ctx, facts, chat });
	return {
		chat,
		side,
		userId,
		/** The caller's participant row in the chat's conference, when they are a party. */
		participantId:
			side === 'PARTICIPANT' ? participantIdIn({ facts, conferenceId: chat.conferenceId }) : null
	};
}

/** `readableChat` for somebody who takes part in it: a party or the inbox. FORBIDDEN while only reviewing. */
export async function assertTakesPartInChat({ ctx, id }: { ctx: ApiContext; id: string }) {
	const found = await readableChat({ ctx, id });
	if (found.side === 'REVIEW') {
		throw apiError({ code: 'FORBIDDEN', message: m.chatRefusedReview() });
	}
	return { ...found, side: found.side };
}

/**
 * Refuses (TERMS_NOT_ACCEPTED) a participant who has not accepted the message service's terms as
 * they stand. The team writes without.
 */
export async function assertAcceptedTerms(userId: string) {
	if (await hasAcceptedTerms(userId)) return;
	throw apiError({ code: 'TERMS_NOT_ACCEPTED', message: m.chatTermsNotAccepted() });
}

/** `readableChat` for a party of the chat with their own participant row: who blocks and reports. */
export async function assertPartyOfChat({ ctx, id }: { ctx: ApiContext; id: string }) {
	const found = await readableChat({ ctx, id });
	if (found.side !== 'PARTICIPANT' || !found.participantId) {
		throw apiError({ code: 'FORBIDDEN', message: m.chatOnlyParties() });
	}
	return { ...found, participantId: found.participantId };
}

/**
 * Refuses (FORBIDDEN) unless the caller takes part in the conference as a delegation member or a
 * single participant. Returns their participant row's id.
 */
export async function assertWritingParticipant({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	ctx.mustBeLoggedIn();
	const participantId = writingParticipantId({
		ctx,
		facts: await callerFacts(ctx),
		conferenceId
	});
	if (!participantId) throw apiError({ code: 'FORBIDDEN', message: m.chatOnlyParticipants() });
	return participantId;
}

/**
 * Refuses (FORBIDDEN) unless the caller may list the conference's contacts: as somebody who writes
 * there (`writingParticipantId`), or as a team member answering one of its inboxes. Returns the
 * caller's own participant row, if they take part, and whether they learn the accounts behind the
 * roles (participant care).
 */
export async function assertCanListContacts({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	ctx.mustBeLoggedIn();
	const facts = await callerFacts(ctx);
	const participantId = writingParticipantId({ ctx, facts, conferenceId });
	if (participantId) return { participantId, exposeAccount: false };
	const exposeAccount = caresFor({ ctx, facts, conferenceId });
	const answersAnInbox =
		exposeAccount || facts.teamFunctions.some((held) => held.conferenceId === conferenceId);
	if (!answersAnInbox) throw apiError({ code: 'FORBIDDEN', message: m.chatOnlyParticipants() });
	return { participantId: undefined, exposeAccount };
}

/** Refuses (FORBIDDEN) unless the caller is a member of a delegation of the conference. Returns its id. */
export async function assertDelegationMember({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	ctx.mustBeLoggedIn();
	const facts = await callerFacts(ctx);
	const membership = callerUserId(ctx)
		? facts.delegationMemberships.find((held) => held.conferenceId === conferenceId)
		: undefined;
	if (!membership) throw apiError({ code: 'FORBIDDEN', message: m.chatOnlyDelegationMembers() });
	return membership.delegationId;
}

/** Refuses (FORBIDDEN) unless the caller answers the inbox (`holdsInbox`). */
export async function assertHoldsInbox({
	ctx,
	conferenceId,
	inbox,
	committeeId,
	trustedUserId = null
}: {
	ctx: ApiContext;
	conferenceId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	trustedUserId?: string | null;
}) {
	ctx.mustBeLoggedIn();
	const facts = await callerFacts(ctx);
	if (!holdsInbox({ ctx, facts, conferenceId, inbox, committeeId, trustedUserId })) {
		throw apiError({ code: 'FORBIDDEN', message: m.chatInboxNotYours() });
	}
}

/** Refuses unless the caller is participant care of the participant's conference. Returns that conference's id. */
export async function assertCanSuspend({
	ctx,
	participantId
}: {
	ctx: ApiContext;
	participantId: string;
}) {
	ctx.mustBeLoggedIn();
	const participant = await db.query.conferenceParticipant.findFirst({
		where: { id: participantId },
		columns: { conferenceId: true }
	});
	if (!participant) throw apiError({ code: 'NOT_FOUND', message: m.chatContactNotFound() });
	await assertTeamPermission({
		ctx,
		conferenceId: participant.conferenceId,
		permission: 'manageParticipants'
	});
	return participant.conferenceId;
}
