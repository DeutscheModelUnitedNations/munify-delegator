import type { DevAccountSub } from '../seed-data/devAccounts';
import type * as schema from '../schema';
import { PERSONA_NATION } from './conference';
import type { ConferenceSeed } from './context';
import { teamMemberId } from './team';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

type Inbox = NonNullable<(typeof schema.chat.$inferInsert)['inbox']>;

/** A message of a seeded chat: who wrote it (a participant, or a team member from the inbox) and how long ago. */
interface SeedMessage {
	from: { participant: string } | { team: DevAccountSub };
	minutesAgo: number;
	body: string;
}

/**
 * Up to when each person has read a seeded chat: whoever is in `readBy` everything, whoever else
 * wrote in it up to their own last message.
 */
function readMarkers({
	chatId,
	messages,
	readBy,
	at
}: {
	chatId: string;
	messages: SeedMessage[];
	readBy: string[];
	at: (minutesAgo: number) => Date;
}) {
	const lastWritten = new Map<string, number>();
	for (const { from, minutesAgo } of messages) {
		if (!('participant' in from) || readBy.includes(from.participant)) continue;
		lastWritten.set(
			from.participant,
			Math.min(lastWritten.get(from.participant) ?? minutesAgo, minutesAgo)
		);
	}
	return [
		...readBy.map((userId) => ({ chatId, userId, readAt: at(0) })),
		...[...lastWritten].map(([userId, minutesAgo]) => ({ chatId, userId, readAt: at(minutesAgo) }))
	];
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
 * answered question to the consultants; `dev-delegate` waits for participant care; and
 * `dev-nsa-delegate` reported a chat twice (after an earlier, settled report of it) and
 * `dev-delegate-minor` their delegation's group, which participant care (`dev-team-care`) finds
 * on the team's messages page. Before the release only the chat with participant care exists.
 */
export function addMessages(cs: ConferenceSeed) {
	if (!cs.conference.messagingEnabled || !cs.plan.assigned) return;
	const [first, second] = cs.committees;
	if (!first || !second) return;
	const now = Date.now();
	const participantId = (userId: string) => cs.participant(userId).id;

	for (const [userId, committeeId, kind] of [
		['dev-team-member', first.id, 'CHAIR'],
		['dev-team-reviewer', first.id, 'CONSULTANT'],
		['dev-team-reviewer', second.id, 'CONSULTANT'],
		// trusted persons of the whole conference
		['dev-team-member', null, 'TRUSTED_PERSON'],
		['dev-team-content-lead', null, 'TRUSTED_PERSON']
	] as const) {
		cs.batch.teamFunction.push({ teamMemberId: teamMemberId({ cs, userId }), committeeId, kind });
	}

	const addChat = ({
		id,
		chat,
		messages,
		readBy = [],
		teamRead = true
	}: {
		id: string;
		chat: Omit<typeof schema.chat.$inferInsert, 'conferenceId'>;
		messages: SeedMessage[];
		/** Who has read everything; the others have not opened the chat since the first message. */
		readBy?: string[];
		teamRead?: boolean;
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
			teamReadAt: chat.kind === 'TEAM' && teamRead ? new Date(now) : null
		});
		for (const message of messages) {
			cs.batch.chatMessage.push({
				chatId,
				createdAt: at(message.minutesAgo),
				body: message.body,
				fromTeam: 'team' in message.from,
				authorParticipantId:
					'participant' in message.from ? participantId(message.from.participant) : null,
				teamAuthorUserId: 'team' in message.from ? message.from.team : null
			});
		}
		cs.batch.chatRead.push(...readMarkers({ chatId, messages, readBy, at }));
		return chatId;
	};

	const teamChat = (userId: string, inbox: Inbox, committeeId: string | null = null) => ({
		kind: 'TEAM' as const,
		participantId: participantId(userId),
		inbox,
		committeeId
	});

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

	const stranger = others.find((member) => member.userId !== neighbour?.userId);
	if (stranger) {
		const chatId = addChat({
			id: 'direct-reported',
			chat: { ...direct('dev-nsa-delegate', stranger.userId), underReview: true },
			messages: [
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
		// an earlier report of the same chat, settled: it shows next to the other party
		cs.batch.chatReport.push({
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
	}
}
