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
import {
	callerFacts,
	liveRule,
	liveWhere,
	type CallerFacts
} from '#api/services/authHelper/callerFacts';
import { callerUserId } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { isGroupChat, type ChatInbox, type ChatSide } from '#lib/helpers/chat';
import { hasAcceptedTerms } from '#api/handlers/messagingTerms/messagingTermsService';
import type { ChatRow } from './chatService';

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
 *
 * The group of a committee or custom role is read by the people seated there, once their seat is
 * released and while the conference opened the groups (`groupChatsEnabled`), and by the team
 * members holding a function there: the committee's chairs and consultants, whoever looks after
 * the role (`ROLE_SUPPORT`). Like a chat between participants, participant care reads it only
 * while a report is open, and a system admin only then.
 */
export function registerChatAbilities() {
	abilityBuilder.chat.allow('read').when(adminChats);
	abilityBuilder.chat.allow('read').when(liveWhere(partyOfChat));
	abilityBuilder.chat.allow('read').when(liveWhere(teamGroupOfChat));
	abilityBuilder.chat.allow('read').when(liveWhere(inboxOfChat));
	abilityBuilder.chat.allow('read').when(liveWhere(trustedChats));

	// A message is read with its chat.
	abilityBuilder.chatMessage.allow('read').when((ctx) => {
		const where = adminChats(ctx)?.where;
		return where ? { where: { chat: where } } : undefined;
	});
	// The parties (and the team in a group) read a message participant care hid without its text
	// and without who hid it and why (`hiddenAt` tells them it is hidden). Masked, the text cannot
	// be filtered by either.
	abilityBuilder.chatMessage
		.allow('read')
		.when(
			liveWhere((args) =>
				hop(takesPartIn(args), (chat) => ({ chat, hiddenAt: { isNull: true as const } }))
			)
		);
	abilityBuilder.chatMessage.allow('read').when(
		liveRule((args) => {
			const where = hop(takesPartIn(args), (chat) => ({
				chat,
				hiddenAt: { isNotNull: true as const }
			}));
			return where && { where, columns: HIDDEN_FROM_PARTIES };
		})
	);
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

/** What the parties of a chat do not read of a message participant care hid. */
const HIDDEN_FROM_PARTIES = {
	body: false,
	hiddenById: false,
	hiddenReason: false,
	hiddenReportId: false
} as const;

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

/** The committees and custom roles whose groups somebody is in. */
export interface GroupIds {
	committeeIds: readonly string[];
	roleIds: readonly string[];
}

/**
 * The groups the caller is in as a participant: of the committee they are seated in or the custom
 * role they hold, where the conference released the seats and opened the groups. Undefined for an
 * anonymous caller and an assistant.
 */
function seatedGroupIds({ ctx, facts }: RuleArgs): GroupIds | undefined {
	if (!callerUserId(ctx)) return undefined;
	const open = facts.groupSeats.filter((seat) => {
		const flags = facts.conferences.get(seat.conferenceId);
		return flags?.assignmentReleased === true && flags.groupChatsEnabled;
	});
	return {
		committeeIds: open.flatMap((seat) => (seat.committeeId ? [seat.committeeId] : [])),
		roleIds: open.flatMap((seat) => (seat.roleId ? [seat.roleId] : []))
	};
}

/**
 * The groups the caller is in for the team: of the committees they chair or advise, and of the
 * custom roles they look after.
 */
function teamGroupIds(facts: Pick<CallerFacts, 'teamFunctions'>): GroupIds {
	return {
		committeeIds: [
			...functionCommitteeIds({ facts, kind: 'CHAIR' }),
			...functionCommitteeIds({ facts, kind: 'CONSULTANT' })
		],
		roleIds: facts.teamFunctions.flatMap((held) =>
			held.kind === 'ROLE_SUPPORT' && held.roleId ? [held.roleId] : []
		)
	};
}

/** Matches the groups of `ids`. */
function groupsOf(ids: GroupIds) {
	return [
		{ kind: 'COMMITTEE' as const, committeeId: idIn(ids.committeeIds) },
		{ kind: 'ROLE' as const, roleId: idIn(ids.roleIds) }
	];
}

/** Whether a group chat is one of `ids`. */
function isGroupIn({
	chat,
	ids
}: {
	chat: Pick<ChatRow, 'kind' | 'committeeId' | 'roleId'>;
	ids: GroupIds;
}) {
	if (chat.kind === 'COMMITTEE')
		return !!chat.committeeId && ids.committeeIds.includes(chat.committeeId);
	if (chat.kind === 'ROLE') return !!chat.roleId && ids.roleIds.includes(chat.roleId);
	return false;
}

/** Matches the chats the caller is a party of; undefined for an anonymous caller and an assistant. */
function partyOfChat(args: RuleArgs) {
	const ids = ownParticipantIds(args);
	const groups = seatedGroupIds(args);
	if (!ids || !groups) return undefined;
	const delegationIds = args.facts.delegationMemberships.map(
		(membership) => membership.delegationId
	);
	return {
		OR: [
			{ participantId: idIn(ids) },
			{ otherParticipantId: idIn(ids) },
			{ kind: 'DELEGATION' as const, delegationId: idIn(delegationIds) },
			...groupsOf(groups)
		]
	};
}

/**
 * Matches the groups the caller is in for the team (`teamGroupIds`); undefined for an anonymous
 * caller.
 */
function teamGroupOfChat({ ctx, facts }: RuleArgs) {
	if (!ctx.oidc.user?.sub) return undefined;
	return { OR: groupsOf(teamGroupIds(facts)) };
}

/** Matches the chats the caller writes in as a party, or as the team in a group. */
function takesPartIn(args: RuleArgs) {
	const parts = [partyOfChat(args), teamGroupOfChat(args)].filter((part) => part !== undefined);
	return parts.length > 0 ? { OR: parts } : undefined;
}

function functionCommitteeIds({
	facts,
	kind
}: {
	facts: Pick<CallerFacts, 'teamFunctions'>;
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
			},
			{
				kind: 'TEAM' as const,
				inbox: 'ROLE_SUPPORT' as const,
				roleId: idIn(teamGroupIds(facts).roleIds)
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
	roleId = null,
	trustedUserId = null
}: RuleArgs & {
	conferenceId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	/** The custom role of a `ROLE_SUPPORT` inbox. */
	roleId?: string | null;
	/** The one trusted person a chat is with; null for their shared inbox and every other one */
	trustedUserId?: string | null;
}) {
	if (inbox === 'TRUSTED_PERSON') {
		return holdsTrustedInbox({ ctx, facts, conferenceId, trustedUserId });
	}
	const care = teamConferenceIds({ ctx, facts, roles: PARTICIPANT_CARE_ROLES });
	if (care === 'all') return true;
	if (inbox === 'PARTICIPANT_CARE') return care?.includes(conferenceId) ?? false;
	if (inbox === 'ROLE_SUPPORT') {
		return facts.teamFunctions.some((held) => held.kind === inbox && held.roleId === roleId);
	}
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
 * inbox or in its group for the team (`TEAM`), or participant care reading a reported chat
 * (`REVIEW`).
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
		| 'roleId'
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
	if (isGroupChat(chat.kind)) {
		const seated = seatedGroupIds({ ctx, facts });
		if (seated && isGroupIn({ chat, ids: seated })) return 'PARTICIPANT';
		return isGroupIn({ chat, ids: teamGroupIds(facts) }) ? 'TEAM' : 'REVIEW';
	}
	if (
		chat.kind === 'TEAM' &&
		chat.inbox &&
		holdsInbox({
			ctx,
			facts,
			conferenceId: chat.conferenceId,
			inbox: chat.inbox,
			committeeId: chat.committeeId,
			roleId: chat.roleId,
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

/** `readableChat` for somebody answering the chat's inbox, who files it. FORBIDDEN for anybody else. */
export async function assertAnswersInboxOfChat({ ctx, id }: { ctx: ApiContext; id: string }) {
	const found = await readableChat({ ctx, id });
	if (found.side !== 'TEAM') {
		throw apiError({ code: 'FORBIDDEN', message: m.chatInboxNotYours() });
	}
	return found;
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
	roleId = null,
	trustedUserId = null
}: {
	ctx: ApiContext;
	conferenceId: string;
	inbox: ChatInbox;
	committeeId: string | null;
	roleId?: string | null;
	trustedUserId?: string | null;
}) {
	ctx.mustBeLoggedIn();
	const facts = await callerFacts(ctx);
	if (!holdsInbox({ ctx, facts, conferenceId, inbox, committeeId, roleId, trustedUserId })) {
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

/**
 * The reported chat whose reports the caller may settle: participant care of its conference.
 * NOT_FOUND for anybody else, and for a chat without an open report.
 */
export async function assertCanSettleReportsOf({ ctx, chatId }: { ctx: Context; chatId: string }) {
	ctx.mustBeLoggedIn();
	const chat = await db.query.chat.findFirst({ where: { id: chatId, underReview: true } });
	const facts = await callerFacts(ctx);
	if (!chat || !caresFor({ ctx, facts, conferenceId: chat.conferenceId })) {
		throw apiError({ code: 'NOT_FOUND', message: m.chatReportNotFound() });
	}
	return chat;
}

/**
 * The reported chat whose messages the caller may hide: participant care of its conference while a
 * report of it is open, which is when they read it. NOT_FOUND for anybody else, and for a chat
 * without an open report. A team chat is its inbox's and has nothing to hide (FORBIDDEN).
 */
export async function assertCanModerateChat({ ctx, chatId }: { ctx: Context; chatId: string }) {
	const chat = await assertCanSettleReportsOf({ ctx, chatId });
	if (chat.kind === 'TEAM') {
		throw apiError({ code: 'FORBIDDEN', message: m.chatHideTeamChat() });
	}
	return chat;
}

/** `assertCanModerateChat` for the chat a message is in. NOT_FOUND for a message not found. */
export async function assertCanModerateMessage({
	ctx,
	messageId
}: {
	ctx: Context;
	messageId: string;
}) {
	ctx.mustBeLoggedIn();
	const message = await db.query.chatMessage.findFirst({
		where: { id: messageId },
		columns: { chatId: true }
	});
	if (!message) throw apiError({ code: 'NOT_FOUND', message: m.chatMessageNotFound() });
	return assertCanModerateChat({ ctx, chatId: message.chatId });
}

/**
 * The groups of the conference the caller is in: as a participant those of their seat, once it is
 * released and while the groups are open, for the team those of the functions they hold there.
 */
export function groupIdsIn({
	ctx,
	facts,
	conferenceId
}: RuleArgs & { conferenceId: string }): GroupIds {
	const seated = callerUserId(ctx)
		? facts.groupSeats.filter((seat) => seat.conferenceId === conferenceId)
		: [];
	const flags = facts.conferences.get(conferenceId);
	const open = flags?.assignmentReleased === true && flags.groupChatsEnabled ? seated : [];
	const team = ctx.oidc.user?.sub
		? teamGroupIds({
				teamFunctions: facts.teamFunctions.filter((held) => held.conferenceId === conferenceId)
			})
		: { committeeIds: [], roleIds: [] };
	return {
		committeeIds: [
			...new Set([
				...open.flatMap((seat) => (seat.committeeId ? [seat.committeeId] : [])),
				...team.committeeIds
			])
		],
		roleIds: [
			...new Set([...open.flatMap((seat) => (seat.roleId ? [seat.roleId] : [])), ...team.roleIds])
		]
	};
}

/**
 * Refuses (FORBIDDEN) unless the caller is in the group of the committee or custom role
 * (`groupIdsIn`): seated there with the groups open, or holding a function there.
 */
export async function assertInGroup({
	ctx,
	conferenceId,
	group
}: {
	ctx: ApiContext;
	conferenceId: string;
	group: { committeeId: string } | { roleId: string };
}) {
	ctx.mustBeLoggedIn();
	const ids = groupIdsIn({ ctx, facts: await callerFacts(ctx), conferenceId });
	const inIt =
		'committeeId' in group
			? ids.committeeIds.includes(group.committeeId)
			: ids.roleIds.includes(group.roleId);
	if (!inIt) throw apiError({ code: 'FORBIDDEN', message: m.chatNotInGroup() });
}

/** Refuses (FORBIDDEN) unless the caller may mute the chat: somebody in its group. */
export async function assertCanMuteChat({ ctx, id }: { ctx: ApiContext; id: string }) {
	const found = await readableChat({ ctx, id });
	if (found.side === 'REVIEW' || !isGroupChat(found.chat.kind)) {
		throw apiError({ code: 'FORBIDDEN', message: m.chatOnlyGroupsCanBeMuted() });
	}
	return found;
}
