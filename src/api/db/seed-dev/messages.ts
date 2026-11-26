import type { DevAccountSub } from '../seed-data/devAccounts';
import type * as schema from '../schema';
import { seedAcceptancesOf } from '#api/handlers/messagingTerms/termsOnDisk';
import { PERSONA_NATION } from './conference';
import type { SeedBatch } from './batch';
import type { ConferenceSeed } from './context';
import { teamMemberId } from './team';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

type Inbox = NonNullable<(typeof schema.chat.$inferInsert)['inbox']>;
type FunctionKind = (typeof schema.teamFunction.$inferInsert)['kind'];

/**
 * The id of a team persona's committee function, custom role support (`roleId`), or trusted
 * person (without either).
 */
export function teamFunctionId({
	cs,
	userId,
	kind,
	committeeId,
	roleId = null
}: {
	cs: ConferenceSeed;
	userId: DevAccountSub;
	kind: FunctionKind;
	committeeId: string | null;
	roleId?: string | null;
}) {
	return cs.rowId(`function-${userId}-${kind}-${committeeId ?? roleId ?? 'conference'}`);
}

/** The id of the `index`th message of a seeded chat, for what points at it (mails, Slack). */
export const chatMessageId = ({ chatId, index }: { chatId: string; index: number }) =>
	`${chatId}-message-${index}`;

/** A message of a seeded chat: who wrote it (a participant, or a team member from the inbox) and how long ago. */
interface SeedMessage {
	from: { participant: string } | { team: DevAccountSub };
	minutesAgo: number;
	body: string;
	/** The paper the team wrote from */
	paperId?: string;
	/** Hidden by participant care under a report, that many minutes ago */
	hidden?: { by: DevAccountSub; reportId: string; reason: string; minutesAgo: number };
}

/**
 * Up to when each person has read a seeded chat: whoever is in `readBy` everything, whoever else
 * wrote in it up to their own last message (in a group the team too).
 */
function readMarkers({
	chatId,
	messages,
	readBy,
	at,
	groupChat
}: {
	chatId: string;
	messages: SeedMessage[];
	readBy: string[];
	at: (minutesAgo: number) => Date;
	/** A group of a committee or role, where team members read for themselves */
	groupChat: boolean;
}) {
	const lastWritten = new Map<string, number>();
	for (const { from, minutesAgo } of messages) {
		// the team reads a team chat as its inbox (`teamReadAt`), a group each for themselves
		const author = 'participant' in from ? from.participant : groupChat ? from.team : undefined;
		if (!author || readBy.includes(author)) continue;
		lastWritten.set(author, Math.min(lastWritten.get(author) ?? minutesAgo, minutesAgo));
	}
	return [
		...readBy.map((userId) => ({ chatId, userId, readAt: at(0) })),
		...[...lastWritten].map(([userId, minutesAgo]) => ({ chatId, userId, readAt: at(minutesAgo) }))
	];
}

/**
 * The team personas' functions (see `addMessages`). Returns the custom role the single
 * participant persona holds (the press), which `dev-team-content-lead` looks after.
 */
function addTeamFunctions(cs: ConferenceSeed) {
	const [first, second] = cs.committees;
	if (!first || !second) return undefined;
	for (const [userId, committeeId, kind] of [
		['dev-team-member', first.id, 'CHAIR'],
		['dev-team-reviewer', first.id, 'CONSULTANT'],
		['dev-team-reviewer', second.id, 'CONSULTANT'],
		// trusted persons of the whole conference
		['dev-team-member', null, 'TRUSTED_PERSON'],
		['dev-team-content-lead', null, 'TRUSTED_PERSON']
	] as const) {
		cs.batch.teamFunction.push({
			id: teamFunctionId({ cs, userId, kind, committeeId }),
			teamMemberId: teamMemberId({ cs, userId }),
			committeeId,
			kind
		});
	}
	// the press, which the single participant persona holds
	const [pressRoleId] = cs.customRoleIds;
	if (pressRoleId) {
		cs.batch.teamFunction.push({
			id: teamFunctionId({
				cs,
				userId: 'dev-team-content-lead',
				kind: 'ROLE_SUPPORT',
				committeeId: null,
				roleId: pressRoleId
			}),
			teamMemberId: teamMemberId({ cs, userId: 'dev-team-content-lead' }),
			roleId: pressRoleId,
			kind: 'ROLE_SUPPORT'
		});
	}
	return pressRoleId;
}

/**
 * The chats (see "Messages" in CLAUDE.md), in the conferences that switched them on. Team personas
 * hold committee functions, so the chairs' and consultants' inboxes are answered:
 * `dev-team-member` chairs the first committee, `dev-team-reviewer` advises the first two.
 * `dev-team-member` and `dev-team-content-lead` are trusted persons: `dev-delegate-minor` wrote
 * to both of them together and to `dev-team-member` alone.
 *
 * Where the roles are released, `dev-head-delegate` has an unread direct chat with another
 * delegate of their committee, one with the single participant, the delegation's group and an
 * answered question to the consultants, and an answer to the chairs (`dev-team-member`, who
 * wrote from their position paper) waiting unread; `dev-delegate` waits for participant care; and
 * `dev-nsa-delegate` reported a chat twice (after an earlier, settled report of it), blocked the
 * other party, whom participant care suspended from writing, and `dev-delegate-minor` reported
 * their delegation's group, which participant care (`dev-team-care`) finds on the team's
 * messages page. Before the release only the chat with participant care exists.
 *
 * `dev-team-content-lead` looks after the custom role `dev-single` holds (the press): where the
 * groups are open (`groupChatsEnabled`), the first committee's group has the head delegate, a
 * neighbour and the chair talking (unread for the consultant, who muted it), the press group has
 * the single participant and their support, and the single participant's question to their role's
 * inbox waits unread.
 *
 * The team and the own delegation are reached from the registration on, whatever the switch says:
 * in "Registration open" (switch off) `dev-reg-head-ready` asked participant care about the
 * application, and their not yet applied delegation talks in its group with `dev-reg-member`.
 */
export function addMessages(cs: ConferenceSeed) {
	const registering = cs.plan.key === 'registration';
	if (!registering && (!cs.conference.messagingEnabled || !cs.plan.assigned)) return;
	const [first, second] = cs.committees;
	if (!first || !second) return;
	const now = Date.now();
	const participantId = (userId: string) => cs.participant(userId).id;

	const pressRoleId = addTeamFunctions(cs);

	const addChat = ({
		id,
		chat,
		messages,
		readBy = [],
		teamRead = true,
		archived = false
	}: {
		id: string;
		chat: Omit<typeof schema.chat.$inferInsert, 'conferenceId'>;
		messages: SeedMessage[];
		/** Who has read everything; the others have not opened the chat since the first message. */
		readBy?: string[];
		teamRead?: boolean;
		/** Put away by its inbox */
		archived?: boolean;
	}) => {
		const chatId = cs.rowId(`chat-${id}`);
		const at = (minutesAgo: number) => new Date(now - minutesAgo * MINUTE);
		const fromParticipant = messages.filter((message) => 'participant' in message.from);
		cs.batch.chat.push({
			...chat,
			id: chatId,
			conferenceId: cs.id,
			lastMessageAt: at(Math.min(...messages.map((message) => message.minutesAgo))),
			lastParticipantMessageAt:
				chat.kind === 'TEAM' && fromParticipant.length > 0
					? at(Math.min(...fromParticipant.map((message) => message.minutesAgo)))
					: null,
			teamReadAt: chat.kind === 'TEAM' && teamRead ? new Date(now) : null,
			teamArchivedAt: archived ? new Date(now) : null
		});
		for (const [index, message] of messages.entries()) {
			cs.batch.chatMessage.push({
				id: chatMessageId({ chatId, index }),
				chatId,
				paperId: message.paperId ?? null,
				createdAt: at(message.minutesAgo),
				body: message.body,
				fromTeam: 'team' in message.from,
				authorParticipantId:
					'participant' in message.from ? participantId(message.from.participant) : null,
				teamAuthorUserId: 'team' in message.from ? message.from.team : null,
				...(message.hidden
					? {
							hiddenAt: at(message.hidden.minutesAgo),
							hiddenById: message.hidden.by,
							hiddenReason: message.hidden.reason,
							hiddenReportId: message.hidden.reportId
						}
					: {})
			});
		}
		const groupChat = chat.kind === 'COMMITTEE' || chat.kind === 'ROLE';
		cs.batch.chatRead.push(...readMarkers({ chatId, messages, readBy, at, groupChat }));
		return chatId;
	};

	const teamChat = (userId: string, inbox: Inbox, committeeId: string | null = null) => ({
		kind: 'TEAM' as const,
		participantId: participantId(userId),
		inbox,
		committeeId
	});

	if (registering) {
		addChat({
			id: 'care-registration',
			chat: teamChat('dev-reg-head-ready', 'PARTICIPANT_CARE'),
			messages: [
				{
					from: { participant: 'dev-reg-head-ready' },
					minutesAgo: 3 * 60,
					body: 'Hallo! Müssen alle aus unserer Delegation von derselben Schule kommen?'
				},
				{
					from: { team: 'dev-team-care' },
					minutesAgo: 2 * 60,
					body: 'Hallo! Nein, jede Person gibt ihre eigene Schule an. Ihr könnt euch gern gemischt bewerben.'
				},
				{
					from: { participant: 'dev-reg-head-ready' },
					minutesAgo: 30,
					body: 'Super, danke! Und bis wann müssen die Bewerbungstexte fertig sein?'
				}
			],
			readBy: ['dev-reg-head-ready'],
			teamRead: false
		});
		addChat({
			id: 'group-registration',
			chat: { kind: 'DELEGATION', delegationId: cs.rowId('delegation-ready') },
			messages: [
				{
					from: { participant: 'dev-reg-head-ready' },
					minutesAgo: 26 * 60,
					body: 'Ich habe unsere Rollenwünsche eingetragen. Schaut ihr bitte noch drüber, bevor wir die Bewerbung abschicken?'
				},
				{
					from: { participant: 'dev-reg-member' },
					minutesAgo: 20 * 60,
					body: 'Sieht gut aus! Ich schreibe heute Abend noch meinen Teil der Motivation.'
				}
			],
			readBy: ['dev-reg-member']
		});
		return;
	}

	// the trusted persons are reached at any time, before the roles are released too
	addChat({
		id: 'trusted-shared',
		chat: teamChat('dev-delegate-minor', 'TRUSTED_PERSON'),
		messages: [
			{
				from: { participant: 'dev-delegate-minor' },
				minutesAgo: 70,
				body: 'Hallo, ich fühle mich in meiner Delegation nicht wohl und weiß nicht, mit wem ich darüber reden kann.'
			}
		],
		readBy: ['dev-delegate-minor'],
		teamRead: false
	});
	addChat({
		id: 'trusted-personal',
		chat: { ...teamChat('dev-delegate-minor', 'TRUSTED_PERSON'), trustedUserId: 'dev-team-member' },
		messages: [
			{
				from: { participant: 'dev-delegate-minor' },
				minutesAgo: 2 * 24 * 60,
				body: 'Hallo, kann ich dich am ersten Konferenztag kurz allein sprechen?'
			},
			{
				from: { team: 'dev-team-member' },
				minutesAgo: 2 * 24 * 60 - 20,
				body: 'Na klar. Komm in der ersten Pause einfach zum Infopoint, ich nehme mir Zeit für dich.'
			}
		],
		readBy: ['dev-delegate-minor']
	});

	if (!cs.conference.assignmentReleased) {
		addChat({
			id: 'care-early',
			chat: teamChat('dev-head-delegate', 'PARTICIPANT_CARE'),
			messages: [
				{
					from: { participant: 'dev-head-delegate' },
					minutesAgo: 180,
					body: 'Hallo! Wann erfahren wir, welches Land wir vertreten?'
				},
				{
					from: { team: 'dev-team-care' },
					minutesAgo: 150,
					body: 'Hallo! Die Zuteilung läuft noch. Wir veröffentlichen die Rollen in den nächsten Tagen, dann bekommt ihr eine Mail.'
				}
			]
		});
		return;
	}

	const direct = (a: string, b: string) => {
		const [participant, other] = [participantId(a), participantId(b)].sort();
		return { kind: 'DIRECT' as const, participantId: participant, otherParticipantId: other };
	};

	// another nation's delegate in the head delegate's committee
	const others = cs.nationDelegations
		.filter((delegation) => delegation.nation !== PERSONA_NATION)
		.flatMap((delegation) => delegation.members);
	const neighbour =
		others.find((member) => member.committeeId === first.id) ??
		others.find((member) => member.committeeId !== null);
	if (neighbour) {
		addChat({
			id: 'direct-neighbour',
			chat: direct('dev-head-delegate', neighbour.userId),
			messages: [
				{
					from: { participant: 'dev-head-delegate' },
					minutesAgo: 26 * 60,
					body: 'Hallo! Wir sitzen zusammen im Gremium. Habt ihr schon eine Position zum ersten Tagesordnungspunkt?'
				},
				{
					from: { participant: neighbour.userId },
					minutesAgo: 25 * 60,
					body: 'Hi! Ja, wir arbeiten gerade am Positionspapier. Grundsätzlich sind wir für eine verbindliche Regelung.'
				},
				{
					from: { participant: 'dev-head-delegate' },
					minutesAgo: 24 * 60,
					body: 'Das passt gut zu unserer Linie. Wollen wir vor der Konferenz ein gemeinsames Arbeitspapier vorbereiten?'
				},
				{
					from: { participant: neighbour.userId },
					minutesAgo: 40,
					body: 'Gerne! Ich schicke dir morgen einen ersten Entwurf für die operativen Absätze.'
				},
				{
					from: { participant: neighbour.userId },
					minutesAgo: 38,
					body: 'Kennst du noch andere Delegationen, die mitmachen würden?'
				}
			],
			readBy: [neighbour.userId]
		});
	}

	addChat({
		id: 'direct-single',
		chat: direct('dev-head-delegate', 'dev-single'),
		messages: [
			{
				from: { participant: 'dev-single' },
				minutesAgo: 3 * 24 * 60,
				body: 'Guten Tag! Ich berichte von der Konferenz und würde gern ein kurzes Interview zu eurer Position führen.'
			},
			{
				from: { participant: 'dev-head-delegate' },
				minutesAgo: 3 * 24 * 60 - 45,
				body: 'Sehr gern. Am besten am ersten Abend nach der Sitzung.'
			}
		],
		readBy: ['dev-head-delegate', 'dev-single']
	});

	const groupChatId = addChat({
		id: 'delegation-germany',
		chat: {
			kind: 'DELEGATION',
			delegationId: cs.rowId('delegation-germany'),
			underReview: true
		},
		messages: [
			{
				from: { participant: 'dev-head-delegate' },
				minutesAgo: 2 * 24 * 60,
				body: 'Willkommen in unserer Delegationsgruppe! Hier stimmen wir uns ab.'
			},
			{
				from: { participant: 'dev-delegate' },
				minutesAgo: 2 * 24 * 60 - 30,
				body: 'Super. Ich übernehme das Positionspapier für mein Gremium bis Freitag.'
			},
			{
				from: { participant: 'dev-delegate-minor' },
				minutesAgo: 90,
				body: 'Ich habe noch kein Gremium. Könnt ihr mich bitte zuteilen?'
			}
		],
		readBy: ['dev-delegate', 'dev-delegate-minor']
	});
	cs.batch.chatReport.push({
		id: cs.rowId('chat-report-delegation'),
		conferenceId: cs.id,
		chatId: groupChatId,
		reporterUserId: 'dev-delegate-minor',
		reason: 'Ich werde in der Gruppe übergangen und bekomme auf meine Fragen keine Antwort.',
		createdAt: new Date(now - 50 * 60 * 1000)
	});

	addChat({
		id: 'consultants',
		chat: teamChat('dev-head-delegate', 'CONSULTANT', first.id),
		messages: [
			{
				from: { participant: 'dev-head-delegate' },
				minutesAgo: 5 * 60,
				body: 'Hallo! Gibt es eine Längenvorgabe für das Positionspapier?'
			},
			{
				from: { team: 'dev-team-reviewer' },
				minutesAgo: 4 * 60,
				body: 'Hallo! Eine Seite reicht völlig. Wichtig sind eure Position und zwei bis drei konkrete Lösungsvorschläge.'
			}
		],
		readBy: ['dev-head-delegate']
	});

	// the chair wrote from the head delegate's paper; the answer waits in the chairs' inbox
	const headPaper = cs.batch.paper.find(
		(paper) =>
			paper.authorParticipantId === participantId('dev-head-delegate') &&
			paper.type === 'POSITION_PAPER'
	);
	addChat({
		id: 'chairs',
		chat: teamChat('dev-head-delegate', 'CHAIR', first.id),
		messages: [
			{
				from: { team: 'dev-team-member' },
				minutesAgo: 8 * 60,
				body: 'Hallo! Zu eurem Positionspapier: Bitte ergänzt noch, wie ihr die Finanzierung sicherstellen wollt.',
				paperId: headPaper?.id
			},
			{
				from: { participant: 'dev-head-delegate' },
				minutesAgo: 30,
				body: 'Danke für den Hinweis! Dürfen wir die überarbeitete Fassung noch nach der Frist einreichen?'
			}
		],
		readBy: ['dev-head-delegate'],
		teamRead: false
	});

	addChat({
		id: 'care-waiting',
		chat: teamChat('dev-delegate', 'PARTICIPANT_CARE'),
		messages: [
			{
				from: { participant: 'dev-delegate' },
				minutesAgo: 50,
				body: 'Hallo, ich habe meinen Beitrag überwiesen, aber im Dashboard steht die Zahlung noch als offen. Könnt ihr das prüfen?'
			}
		],
		readBy: ['dev-delegate'],
		teamRead: false
	});

	// settled and put away: in the archive of participant care's inbox until the next message
	addChat({
		id: 'care-archived',
		chat: teamChat('dev-nsa-delegate', 'PARTICIPANT_CARE'),
		messages: [
			{
				from: { participant: 'dev-nsa-delegate' },
				minutesAgo: 3 * 24 * 60,
				body: 'Hallo, ich habe meinen Teilnahmeausweis verloren. Bekomme ich einen neuen?'
			},
			{
				from: { team: 'dev-team-care' },
				minutesAgo: 3 * 24 * 60 - 30,
				body: 'Kein Problem, am Infopoint liegt ein neuer für dich bereit.'
			},
			{
				from: { participant: 'dev-nsa-delegate' },
				minutesAgo: 3 * 24 * 60 - 40,
				body: 'Super, vielen Dank!'
			}
		],
		readBy: ['dev-nsa-delegate'],
		archived: true
	});

	const stranger = others.find((member) => member.userId !== neighbour?.userId);
	if (stranger) {
		const chatId = addChat({
			id: 'direct-reported',
			chat: { ...direct('dev-nsa-delegate', stranger.userId), underReview: true },
			messages: [
				// hidden under the earlier report, which is settled: its case keeps the text
				{
					from: { participant: stranger.userId },
					minutesAgo: 3 * 24 * 60 + 20,
					body: 'Eure Organisation ist ein Witz, euch nimmt hier sowieso niemand ernst.',
					hidden: {
						by: 'dev-team-care',
						reportId: cs.rowId('chat-report-direct-earlier'),
						reason: 'Abwertende Äußerung über die Organisation der Delegation.',
						minutesAgo: 3 * 24 * 60 - 20
					}
				},
				{
					from: { participant: stranger.userId },
					minutesAgo: 6 * 60,
					body: 'Euer Akteur hat in unserem Gremium nichts zu suchen. Haltet euch besser raus.'
				},
				{
					from: { participant: 'dev-nsa-delegate' },
					minutesAgo: 6 * 60 - 10,
					body: 'Wir haben Rederecht wie alle anderen. Bitte bleib sachlich.'
				},
				{
					from: { participant: stranger.userId },
					minutesAgo: 6 * 60 - 20,
					body: 'Wir werden ja sehen, wer am Ende zuhört.'
				}
			],
			readBy: ['dev-nsa-delegate', stranger.userId]
		});
		cs.batch.chatReport.push({
			id: cs.rowId('chat-report-direct'),
			conferenceId: cs.id,
			chatId,
			reporterUserId: 'dev-nsa-delegate',
			reason: 'Die Person schreibt unfreundlich und versucht, uns einzuschüchtern.',
			createdAt: new Date(now - 5 * HOUR)
		});
		cs.batch.chatReport.push({
			conferenceId: cs.id,
			chatId,
			reporterUserId: 'dev-nsa-delegate',
			reason: 'Es geht weiter, obwohl ich um einen sachlichen Ton gebeten habe.',
			createdAt: new Date(now - 4 * HOUR)
		});
		// an earlier report of the same chat, settled, with the message hidden under it: it shows
		// next to the other party
		cs.batch.chatReport.push({
			id: cs.rowId('chat-report-direct-earlier'),
			conferenceId: cs.id,
			chatId,
			reporterUserId: 'dev-nsa-delegate',
			reason: 'Abfällige Bemerkung über unsere Organisation.',
			createdAt: new Date(now - 3 * 24 * HOUR),
			status: 'RESOLVED',
			resolvedById: 'dev-team-care',
			resolvedAt: new Date(now - 3 * 24 * HOUR + HOUR),
			resolutionNote: 'Mit beiden gesprochen. Entschuldigung angenommen, keine Sperre.'
		});
		// the reporter blocked the other party, and participant care suspended them meanwhile
		cs.batch.chatBlock.push({
			blockerParticipantId: participantId('dev-nsa-delegate'),
			blockedParticipantId: participantId(stranger.userId)
		});
		cs.participant(stranger.userId).messagingSuspended = true;
		acceptTerms({ batch: cs.batch, userIds: [stranger.userId] });
	}
	if (neighbour) acceptTerms({ batch: cs.batch, userIds: [neighbour.userId] });

	addRoleChats({
		cs,
		addChat,
		pressRoleId,
		// only somebody seated in the first committee writes in its group
		neighbour: neighbour?.committeeId === first.id ? neighbour : undefined
	});
}

/** The press inbox's waiting question and, where the groups are open, the groups. */
function addRoleChats({ cs, addChat, pressRoleId, neighbour }: Parameters<typeof addGroups>[0]) {
	if (pressRoleId) {
		addChat({
			id: 'role-inbox-press',
			chat: {
				kind: 'TEAM',
				participantId: cs.participant('dev-single').id,
				inbox: 'ROLE_SUPPORT',
				roleId: pressRoleId
			},
			messages: [
				{
					from: { participant: 'dev-single' },
					minutesAgo: 45,
					body: 'Hallo! Bekommen wir Presseausweise, oder reicht der normale Teilnahmeausweis?'
				}
			],
			readBy: ['dev-single'],
			teamRead: false
		});
	}
	if (cs.conference.groupChatsEnabled) addGroups({ cs, addChat, neighbour, pressRoleId });
}

/** The groups of the first committee and of the press (see `addMessages`). */
function addGroups({
	cs,
	addChat,
	neighbour,
	pressRoleId
}: {
	cs: ConferenceSeed;
	addChat: (args: {
		id: string;
		chat: Omit<typeof schema.chat.$inferInsert, 'conferenceId'>;
		messages: SeedMessage[];
		readBy?: string[];
		teamRead?: boolean;
	}) => string;
	neighbour: { userId: string } | undefined;
	pressRoleId: string | undefined;
}) {
	const [first] = cs.committees;
	if (!first) return;
	const committeeChatId = addChat({
		id: 'group-committee-first',
		chat: { kind: 'COMMITTEE', committeeId: first.id },
		messages: [
			{
				from: { team: 'dev-team-member' },
				minutesAgo: 3 * 24 * 60,
				body: 'Herzlich willkommen im Gremium! Hier geben wir Ablauf und Fristen bekannt. Fragen gern jederzeit.'
			},
			{
				from: { participant: 'dev-head-delegate' },
				minutesAgo: 2 * 24 * 60,
				body: 'Danke! Gibt es eine Rednerliste schon vor der ersten Sitzung?'
			},
			{
				from: { team: 'dev-team-member' },
				minutesAgo: 2 * 24 * 60 - 60,
				body: 'Ja, die Rednerliste öffnet am ersten Konferenztag um 9 Uhr.'
			},
			...(neighbour
				? [
						{
							from: { participant: neighbour.userId },
							minutesAgo: 35,
							body: 'Wollen wir vor der Konferenz noch einen gemeinsamen Videocall machen?'
						}
					]
				: [])
		],
		readBy: ['dev-team-member', ...(neighbour ? [neighbour.userId] : [])]
	});
	// the consultant reads along now and then; the group stays quiet for them
	cs.batch.chatMute.push({ chatId: committeeChatId, userId: 'dev-team-reviewer' });

	if (!pressRoleId) return;
	addChat({
		id: 'group-role-press',
		chat: { kind: 'ROLE', roleId: pressRoleId },
		messages: [
			{
				from: { team: 'dev-team-content-lead' },
				minutesAgo: 26 * 60,
				body: 'Hallo Presseteam! Die Redaktionssitzung ist jeden Morgen um 8:30 Uhr im Pressebüro.'
			},
			{
				from: { participant: 'dev-single' },
				minutesAgo: 25 * 60,
				body: 'Super, ich bringe Kamera und Laptop mit.'
			}
		],
		readBy: ['dev-single']
	});
}

/**
 * Everybody who wrote in a seeded chat agreed to the terms first, apart from `dev-delegate`, who
 * wrote before there were any and is asked on their next message. `dev-single` gets no mails
 * about unread messages, and `dev-team-content-lead` switched that mail off before the team chose
 * per inbox, so their inbox mails start off. All of it is on the account, in every conference.
 */
export function addMessagingAccountSettings(batch: SeedBatch) {
	acceptTerms({
		batch,
		userIds: [
			'dev-head-delegate',
			'dev-delegate-minor',
			'dev-nsa-delegate',
			'dev-single',
			'dev-reg-head-ready',
			'dev-reg-member'
		]
	});
	for (const user of batch.user) {
		if (user.id === 'dev-single' || user.id === 'dev-team-content-lead')
			user.messageNotificationEmails = false;
	}
}

/** `userIds` accepted the terms as they stand, in German, four days ago (once per account). */
function acceptTerms({ batch, userIds }: { batch: SeedBatch; userIds: string[] }) {
	// once per person, although several conferences seed the same one
	const accepted = new Set(batch.messagingTermsAcceptance.map((acceptance) => acceptance.userId));
	const acceptedAt = new Date(Date.now() - 4 * 24 * HOUR);
	batch.messagingTermsAcceptance.push(
		...seedAcceptancesOf(userIds.filter((userId) => !accepted.has(userId))).map((acceptance) => ({
			...acceptance,
			createdAt: acceptedAt
		}))
	);
}
