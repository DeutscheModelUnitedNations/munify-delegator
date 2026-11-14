import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { callerFacts, refreshCallerAbilities } from '#api/services/authHelper/callerFacts';
import { isSystemAdmin } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { chatPubsub, teamFunctionPubsub } from '#api/pubsub';
import { messagePreview, type ChatInbox } from '#lib/helpers/chat';
import { messagingTermsVersionSchema } from '#lib/helpers/messagingTerms';
import { conferenceContacts, type Contact } from './chatContacts';
import {
	assertCanListContacts,
	assertCanSuspend,
	assertDelegationMember,
	assertHoldsInbox,
	assertAcceptedTerms,
	assertPartyOfChat,
	assertTakesPartInChat,
	assertWritingParticipant,
	chatSide,
	holdsInbox,
	knowsPeopleOf,
	readableChat,
	registerChatAbilities,
	writingParticipantId
} from './chatPermissions';
import {
	chatWriteRefusal,
	acceptMessagingTerms,
	hasBlocked,
	inboxesReaching,
	lastMessageOf,
	markChatRead,
	messageBodySchema,
	openDelegationChat,
	openDirectChat,
	openTeamChat,
	sameInbox,
	sendMessage,
	setChatBlocked,
	setMessageNotificationEmails,
	setMessagingSuspended,
	unreadCount,
	personOfParticipant,
	earlierReportCount,
	trustedUserIdOf,
	userNameOf,
	type ChatRow,
	type InboxOption
} from './chatService';

registerChatAbilities();

const chatInboxEnum = enum_({ tsName: 'chatInbox' });

/** A contact as a reader gets it: the role, and for participant care the account behind it. */
type ContactShape = Contact & { exposeAccount: boolean };

const ChatContact = schemaBuilder.objectRef<ContactShape>('ChatContact');
ChatContact.implement({
	description:
		'A seated person as the chats show them: by role and committee, never by name. `ordinal` tells apart several people sharing both.',
	fields: (t) => ({
		participantId: t.exposeID('participantId'),
		roleId: t.id({ resolve: (contact) => contact.role.id }),
		roleKind: t.string({
			description: 'NATION, NON_STATE_ACTOR or CUSTOM.',
			resolve: (contact) => contact.role.kind
		}),
		nationAlpha3Code: t.string({
			nullable: true,
			resolve: (contact) => contact.role.nationAlpha3Code
		}),
		nationAlpha2Code: t.string({
			nullable: true,
			resolve: (contact) => contact.role.nation?.alpha2Code
		}),
		roleName: t.string({ nullable: true, resolve: (contact) => contact.role.name }),
		roleAbbreviation: t.string({
			nullable: true,
			resolve: (contact) => contact.role.abbreviation
		}),
		roleIcon: t.string({ nullable: true, resolve: (contact) => contact.role.icon }),
		committeeId: t.id({ nullable: true, resolve: (contact) => contact.committee?.id }),
		committeeAbbreviation: t.string({
			nullable: true,
			resolve: (contact) => contact.committee?.abbreviation
		}),
		committeeName: t.string({ nullable: true, resolve: (contact) => contact.committee?.name }),
		ordinal: t.int({ nullable: true, resolve: (contact) => contact.ordinal }),
		userId: t.id({
			nullable: true,
			description: "The person's account: for participant care only, null for everybody else.",
			resolve: (contact) => (contact.exposeAccount ? contact.userId : null)
		}),
		suspended: t.boolean({
			nullable: true,
			description:
				'Whether participant care took the person out of the chats between participants: for participant care only.',
			resolve: (contact) => (contact.exposeAccount ? contact.suspended : null)
		})
	})
});

const ChatInboxOption = schemaBuilder.objectRef<InboxOption & { chatId: string | null }>(
	'ChatInboxOption'
);
ChatInboxOption.implement({
	description: 'A team inbox a chat can be opened with.',
	fields: (t) => ({
		inbox: t.field({ type: chatInboxEnum, resolve: (option) => option.inbox }),
		committeeId: t.id({ nullable: true, resolve: (option) => option.committee?.id }),
		committeeAbbreviation: t.string({
			nullable: true,
			resolve: (option) => option.committee?.abbreviation
		}),
		committeeName: t.string({ nullable: true, resolve: (option) => option.committee?.name }),
		trustedPersonId: t.id({
			nullable: true,
			description:
				'The one trusted person this inbox is, to pass to `openTeamChat`; null for the trusted persons together and for every other inbox.',
			resolve: (option) => option.person?.id
		}),
		personName: t.string({
			nullable: true,
			description: 'The full name of that trusted person.',
			resolve: (option) => option.person?.name
		}),
		chatId: t.id({
			nullable: true,
			description: 'The chat with this inbox, once one was opened.',
			resolve: (option) => option.chatId
		})
	})
});

const ChatPerson = schemaBuilder.simpleObject('ChatPerson', {
	description: 'A participant of a chat by name, as participant care sees them.',
	fields: (t) => ({
		participantId: t.id(),
		userId: t.id(),
		name: t.string(),
		earlierReports: t.int({
			description:
				'How many settled reports there are about chats this person takes part in, not counting their own.'
		})
	})
});

async function sideOf({ ctx, chat }: { ctx: ApiContext; chat: ChatRow }) {
	return chatSide({ ctx, facts: await callerFacts(ctx), chat });
}

/**
 * The seated people of a chat: its one or two parties, or, for a delegation's group, everybody of
 * the delegation.
 */
async function seatedPeopleOf(chat: ChatRow) {
	const contacts = await conferenceContacts(chat.conferenceId);
	if (chat.kind === 'DELEGATION') {
		return [...contacts.values()].filter((contact) => contact.delegationId === chat.delegationId);
	}
	return [chat.participantId, chat.otherParticipantId].flatMap((participantId) => {
		const contact = participantId ? contacts.get(participantId) : undefined;
		return contact ? [contact] : [];
	});
}

/**
 * The participants of the chat other than the caller, as contacts. The members of a delegation's
 * group are listed for participant care only: the members know each other anyway.
 */
async function contactsOfChat({ ctx, chat }: { ctx: ApiContext; chat: ChatRow }) {
	const facts = await callerFacts(ctx);
	const exposeAccount = knowsPeopleOf({ ctx, facts, chat });
	if (chat.kind === 'DELEGATION' && !exposeAccount) return [];
	const own = new Set(facts.participants.map((participant) => participant.id));
	return (await seatedPeopleOf(chat))
		.filter((contact) => !own.has(contact.participantId))
		.map((contact) => ({ ...contact, exposeAccount }));
}

/** Who the people of a chat are, for participant care: name, account and the reports before. */
async function peopleOfChat(chat: ChatRow) {
	const seated = await seatedPeopleOf(chat);
	// a party who lost their seat is still a party of a direct or team chat
	const unseated = [chat.participantId, chat.otherParticipantId].flatMap((id) =>
		id && !seated.some((contact) => contact.participantId === id) ? [id] : []
	);
	const rows = await Promise.all(
		[
			...seated.map((contact) => ({
				id: contact.participantId,
				delegationId: contact.delegationId
			})),
			...unseated.map((id) => ({ id, delegationId: null }))
		].map(async ({ id, delegationId }) => {
			const person = await personOfParticipant(id);
			if (!person?.name) return undefined;
			const earlierReports = await earlierReportCount({
				participantId: id,
				userId: person.userId,
				delegationId
			});
			return { ...person, name: person.name, earlierReports };
		})
	);
	return rows.flatMap((row) => (row ? [row] : []));
}

const ChatRef = object({
	table: 'chat',
	adjust: (t) => ({
		side: t.string({
			description:
				'How the caller relates to the chat: `PARTICIPANT` (a party), `TEAM` (answers its inbox) or `REVIEW` (participant care reading a reported chat, who cannot write).',
			resolve: (chat, _args, ctx) => sideOf({ ctx, chat })
		}),
		contacts: t.field({
			type: [ChatContact],
			description:
				'The seated people of the chat other than the caller: the other party of a direct chat, the participant of a team chat for the inbox, both parties, or every member of a delegation group, for participant care. Empty for a member of a delegation group and for someone who holds no seat (any more).',
			resolve: (chat, _args, ctx) => contactsOfChat({ ctx, chat })
		}),
		people: t.field({
			type: [ChatPerson],
			description:
				'Who the participants of the chat are, by name and account: for participant care only (of a team chat, and of a chat it reviews); empty for everybody else, who know the people by role, and always in a chat with the trusted persons.',
			resolve: async (chat, _args, ctx) => {
				const facts = await callerFacts(ctx);
				if (!knowsPeopleOf({ ctx, facts, chat })) return [];
				return peopleOfChat(chat);
			}
		}),
		// the account of a trusted person is theirs alone; everybody else gets the name
		trustedUserId: t.id({
			nullable: true,
			description:
				'A chat with one trusted person: their account, for themselves only (null for everybody else, and for every other chat).',
			resolve: (chat, _args, ctx) =>
				chat.trustedUserId !== null && chat.trustedUserId === callerUserId(ctx)
					? chat.trustedUserId
					: null
		}),
		trustedPersonName: t.string({
			nullable: true,
			description:
				'The full name of the one trusted person the chat is with; null for a chat with all of them and for every other chat.',
			resolve: async (chat) =>
				chat.trustedUserId ? ((await userNameOf(chat.trustedUserId)) ?? null) : null
		}),
		unreadCount: t.int({
			description: 'How many messages the caller (or, for a team chat, their inbox) has not read.',
			resolve: async (chat, _args, ctx) =>
				unreadCount({
					userId: ctx.mustBeLoggedIn().sub,
					side: await sideOf({ ctx, chat }),
					chatId: chat.id
				})
		}),
		lastMessagePreview: t.string({
			nullable: true,
			description: 'The beginning of the latest message.',
			resolve: async (chat) => {
				const last = await lastMessageOf(chat.id);
				return last ? messagePreview(last.body) : null;
			}
		}),
		blockedByMe: t.boolean({
			description: 'A direct chat whose other party the caller blocked.',
			resolve: async (chat, _args, ctx) => {
				const { side, participantId } = await readableChat({ ctx, id: chat.id });
				return side === 'PARTICIPANT' && participantId
					? hasBlocked({ chat, blockerParticipantId: participantId })
					: false;
			}
		}),
		writeRefusal: t.string({
			nullable: true,
			description:
				'Why the caller cannot write into the chat right now (`DISABLED`, `NOT_RELEASED`, `NOT_SEATED`, `SUSPENDED`, `BLOCKED`, `REVIEW`); null when they can.',
			resolve: async (chat, _args, ctx) => {
				const { side, participantId } = await readableChat({ ctx, id: chat.id });
				return chatWriteRefusal({ chat, side, writerParticipantId: participantId });
			}
		})
	})
});
query({ table: 'chat' });

/** The name of the team member who wrote a message from an inbox; null once the account is gone. */
async function teamAuthorName(userId: string | null) {
	return userId ? ((await userNameOf(userId)) ?? null) : null;
}

/**
 * Whether the caller may know the names of the participants writing in the chat: in a delegation
 * group (its members know each other) and as participant care, though never in a chat with the
 * trusted persons.
 */
async function knowsParticipantNames({ ctx, chatId }: { ctx: ApiContext; chatId: string }) {
	const chat = await db.query.chat.findFirst({
		where: { id: chatId },
		columns: { kind: true, conferenceId: true, inbox: true }
	});
	if (!chat) return false;
	if (chat.kind === 'DELEGATION') return true;
	return knowsPeopleOf({ ctx, facts: await callerFacts(ctx), chat });
}

/** `chatMessage.authorName`: the author's name where the reader may know it. */
async function authorNameOf({
	ctx,
	message
}: {
	ctx: ApiContext;
	message: typeof schema.chatMessage.$inferSelect;
}) {
	if (message.fromTeam) return teamAuthorName(message.teamAuthorUserId);
	if (!message.authorParticipantId) return null;
	if (!(await knowsParticipantNames({ ctx, chatId: message.chatId }))) return null;
	return (await personOfParticipant(message.authorParticipantId))?.name ?? null;
}

const ChatMessageRef = object({
	table: 'chatMessage',
	adjust: (t) => ({
		mine: t.boolean({
			description: 'Written by the caller.',
			resolve: async (message, _args, ctx) => {
				const userId = ctx.mustBeLoggedIn().sub;
				if (message.fromTeam) return message.teamAuthorUserId === userId;
				const facts = await callerFacts(ctx);
				return facts.participants.some(
					(participant) => participant.id === message.authorParticipantId
				);
			}
		}),
		// who of the team wrote is told by name (`authorName`), not by account
		teamAuthorUserId: t.id({
			nullable: true,
			description: 'The team member who wrote from the inbox: for the team only.',
			resolve: async (message, _args, ctx) => {
				const facts = await callerFacts(ctx);
				return message.fromTeam && (facts.team.length > 0 || isSystemAdmin(ctx))
					? message.teamAuthorUserId
					: null;
			}
		}),
		authorName: t.string({
			nullable: true,
			description:
				"The author's full name where the reader may know it: of a team member writing from an inbox, of a member of the reader's own delegation group, and of anybody for participant care. Null otherwise: participants know each other by role.",
			resolve: (message, _args, ctx) => authorNameOf({ ctx, message })
		})
	})
});
query({ table: 'chatMessage' });

const readableChatQuery = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.chat.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.queryFields((t) => ({
	chatContacts: t.field({
		description:
			"The conference's seated people, by role, once the roles are released (empty before, and while messaging is off). For a delegation member or single participant: everybody they can open a direct chat with. For a team member answering an inbox: everybody an inbox can write to (`chatInboxes` says which). FORBIDDEN for anybody else.",
		type: [ChatContact],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const { participantId, exposeAccount } = await assertCanListContacts({
				ctx,
				conferenceId: args.conferenceId
			});
			const conference = await db.query.conference.findFirst({
				where: { id: args.conferenceId },
				columns: { messagingEnabled: true, assignmentReleased: true }
			});
			if (!conference?.messagingEnabled || !conference.assignmentReleased) return [];
			const contacts = await conferenceContacts(args.conferenceId);
			// a participant without a seat writes to nobody but the team
			if (participantId && !contacts.has(participantId)) return [];
			return [...contacts.values()]
				.filter((contact) => contact.participantId !== participantId)
				.map((contact) => ({ ...contact, exposeAccount }));
		}
	}),

	chatInboxes: t.field({
		description:
			'The team inboxes a chat can be opened with. Without `participantId`: the ones the caller, taking part in the conference, may write to (participant care, the trusted persons together and each of them by name, and the chairs and consultants of their committee once roles are released). With it: the inboxes the caller answers that reach this participant, for a team member writing to them.',
		type: [ChatInboxOption],
		args: {
			conferenceId: t.arg.id({ required: true }),
			participantId: t.arg.id()
		},
		// functions being handed out or taken away change the inboxes
		subscribe: (subscriptions) => {
			for (const action of ['created', 'removed'] as const) {
				teamFunctionPubsub.registerOnInstance({ instance: subscriptions, action });
				chatPubsub.registerOnInstance({ instance: subscriptions, action });
			}
		},
		resolve: async (_root, args, ctx) => {
			ctx.mustBeLoggedIn();
			const facts = await callerFacts(ctx);
			const own = writingParticipantId({ ctx, facts, conferenceId: args.conferenceId });
			const participantId = args.participantId ?? own;
			if (!participantId) return [];
			const reaching = await inboxesReaching({
				conferenceId: args.conferenceId,
				participantId
			});
			const options = args.participantId
				? reaching.filter(({ inbox, committee, person }) =>
						holdsInbox({
							ctx,
							facts,
							conferenceId: args.conferenceId,
							inbox,
							committeeId: committee?.id ?? null,
							trustedUserId: person?.userId ?? null
						})
					)
				: reaching;
			const chats = await db.query.chat.findMany({
				where: { kind: 'TEAM', participantId, conferenceId: args.conferenceId },
				columns: { id: true, inbox: true, committeeId: true, trustedUserId: true }
			});
			return options.map((option) => ({
				...option,
				chatId: chats.find((chat) => sameInbox({ option, wanted: chat }))?.id ?? null
			}));
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	openDirectChat: t.drizzleField({
		description:
			'The direct chat of the caller with another seated participant of the conference, opened when they have none yet. For delegation members and single participants (FORBIDDEN otherwise) once the roles are released (CONFLICT before, and while messaging is off); NOT_FOUND for a participant without a seat.',
		type: ChatRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			participantId: t.arg.id({ required: true, description: 'From `chatContacts`.' })
		},
		resolve: async (select, _root, args, ctx) => {
			const fromParticipantId = await assertWritingParticipant({
				ctx,
				conferenceId: args.conferenceId
			});
			const chat = await openDirectChat({
				conferenceId: args.conferenceId,
				fromParticipantId,
				toParticipantId: args.participantId
			});
			await refreshCallerAbilities(ctx);
			return db.query.chat
				.findFirst(select(await readableChatQuery({ ctx, id: chat.id })))
				.then(assertFindFirstExists);
		}
	}),

	openDelegationChat: t.drizzleField({
		description:
			"The group chat of the caller's delegation in the conference, opened when it has none yet. For its members (FORBIDDEN otherwise), once the delegation's role is released (CONFLICT before).",
		type: ChatRef,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (select, _root, args, ctx) => {
			const delegationId = await assertDelegationMember({
				ctx,
				conferenceId: args.conferenceId
			});
			const chat = await openDelegationChat({
				conferenceId: args.conferenceId,
				delegationId
			});
			await refreshCallerAbilities(ctx);
			return db.query.chat
				.findFirst(select(await readableChatQuery({ ctx, id: chat.id })))
				.then(assertFindFirstExists);
		}
	}),

	openTeamChat: t.drizzleField({
		description:
			"The chat of a participant with a team inbox, opened when there is none yet. Without `participantId` the caller's own, as a delegation member or single participant; with it a team member opens the chat of that participant with an inbox they answer (FORBIDDEN otherwise). `trustedPersonId` (from `chatInboxes`) makes it the chat with that one trusted person. CONFLICT for an inbox that does not reach the participant (`chatInboxes`) and while messaging is off.",
		type: ChatRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			inbox: t.arg({ type: chatInboxEnum, required: true }),
			committeeId: t.arg.id({ description: "The committee of a chairs' or consultants' inbox." }),
			trustedPersonId: t.arg.id({
				description: 'One trusted person, instead of all of them together.'
			}),
			participantId: t.arg.id()
		},
		resolve: async (select, _root, args, ctx) => {
			const inbox: ChatInbox = args.inbox;
			const committeeId = args.committeeId ?? null;
			const trustedUserId = args.trustedPersonId
				? await trustedUserIdOf({
						conferenceId: args.conferenceId,
						trustedPersonId: args.trustedPersonId
					})
				: null;
			let participantId: string;
			if (args.participantId) {
				await assertHoldsInbox({
					ctx,
					conferenceId: args.conferenceId,
					inbox,
					committeeId,
					trustedUserId
				});
				participantId = args.participantId;
			} else {
				participantId = await assertWritingParticipant({ ctx, conferenceId: args.conferenceId });
			}
			const chat = await openTeamChat({
				conferenceId: args.conferenceId,
				participantId,
				inbox,
				committeeId,
				trustedUserId
			});
			await refreshCallerAbilities(ctx);
			return db.query.chat
				.findFirst(select(await readableChatQuery({ ctx, id: chat.id })))
				.then(assertFindFirstExists);
		}
	}),

	sendChatMessage: t.drizzleField({
		description:
			'Writes a message into a chat the caller takes part in: as a party, or from the inbox of a team chat they answer. NOT_FOUND for a chat they cannot read, FORBIDDEN for participant care reading a reported chat, TERMS_NOT_ACCEPTED for a participant who has not accepted the terms (`acceptMessagingTerms`), CONFLICT while they cannot write there (`chat.writeRefusal`). `paperId` attaches a paper of the participant of a team chat.',
		type: ChatMessageRef,
		args: {
			chatId: t.arg.id({ required: true }),
			body: t.arg.string({ required: true }).validate(messageBodySchema),
			paperId: t.arg.id()
		},
		resolve: async (select, _root, args, ctx) => {
			const { chat, side, userId, participantId } = await assertTakesPartInChat({
				ctx,
				id: args.chatId
			});
			if (side === 'PARTICIPANT') await assertAcceptedTerms(userId);
			const id = await sendMessage({
				chat,
				author:
					side === 'PARTICIPANT' && participantId
						? { side: 'PARTICIPANT', participantId, userId }
						: { side: 'TEAM', userId },
				body: args.body.trim(),
				paperId: args.paperId ?? null
			});
			return db.query.chatMessage
				.findFirst(
					select(
						(await ctx.abilities.chatMessage.filter('read')).merge({ where: { id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	markChatRead: t.field({
		description:
			'Marks a chat as read up to now: for the caller, or, answering a team inbox, for everybody holding it.',
		type: 'Boolean',
		args: { chatId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const { chat, side, userId } = await readableChat({ ctx, id: args.chatId });
			if (side === 'REVIEW') return false;
			await markChatRead({ chat, side, userId });
			return true;
		}
	}),

	setChatBlocked: t.field({
		description:
			'Blocks (or unblocks) the other party of a direct chat: neither can write the other while it lasts. For a party of the chat (FORBIDDEN otherwise).',
		type: 'Boolean',
		args: {
			chatId: t.arg.id({ required: true }),
			blocked: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const { chat, participantId } = await assertPartyOfChat({ ctx, id: args.chatId });
			await setChatBlocked({ chat, blockerParticipantId: participantId, blocked: args.blocked });
			return true;
		}
	}),

	setMessagingSuspended: t.field({
		description:
			'Takes a person out of the chats between participants of their conference, or lets them back in; they keep reaching the team. Participant care only (FORBIDDEN otherwise).',
		type: 'Boolean',
		args: {
			participantId: t.arg.id({ required: true }),
			suspended: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanSuspend({ ctx, participantId: args.participantId });
			await setMessagingSuspended({
				participantId: args.participantId,
				suspended: args.suspended
			});
			return true;
		}
	}),

	acceptMessagingTerms: t.field({
		description:
			"The caller accepts the message service's terms, which a participant has to before they write. `version` is the one they were shown (`MESSAGING_TERMS_VERSION`); INVALID_INPUT for any other, so nobody accepts a text they have not seen.",
		type: 'Boolean',
		args: {
			version: t.arg.int({ required: true }).validate(messagingTermsVersionSchema)
		},
		resolve: async (_root, _args, ctx) => {
			await acceptMessagingTerms(ctx.mustBeLoggedIn().sub);
			return true;
		}
	}),

	setMessageNotificationEmails: t.field({
		description:
			'Whether a mail tells the caller about chat messages they left unread for a while.',
		type: 'Boolean',
		args: { enabled: t.arg.boolean({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await setMessageNotificationEmails({
				userId: ctx.mustBeLoggedIn().sub,
				enabled: args.enabled
			});
			return true;
		}
	})
}));
