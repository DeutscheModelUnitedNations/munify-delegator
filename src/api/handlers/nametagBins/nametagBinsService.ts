import { db, schema } from '#api/db/db';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { assertFindFirstExists } from '@m1212e/rumble';
import { normalizeConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import {
	nationGroup,
	nationInitial,
	nonStateActorGroups,
	ownNametagTable,
	ownSeat,
	singleRoleGroups,
	splitIntoNametagBins,
	type NametagBinGroup,
	type OwnNametagTable
} from './bins';

/** The nametag handout's queries; the split itself is in `bins.ts`. */

/** The bin count, language and release of a conference; NOT_FOUND for none. */
export async function nametagConference(conferenceId: string) {
	const conference = await db.query.conference
		.findFirst({
			where: { id: conferenceId },
			columns: { nametagBinCount: true, language: true, assignmentReleased: true }
		})
		.then(assertFindFirstExists);
	return { ...conference, language: normalizeConferenceLanguage(conference.language) };
}

/**
 * The users of the supervisors who attend and have at least one accepted student: a person with
 * a nation or non-state actor, or a single participant with a role. A supervisor whose students
 * all went without a seat has nothing to attend and gets no nametag.
 */
async function seatedSupervisorUserIds(conferenceId: string): Promise<string[]> {
	const supervisors = await db.query.conferenceSupervisor.findMany({
		where: { participant: { conferenceId }, plansOwnAttendenceAtConference: true },
		columns: {},
		with: {
			participant: { columns: { userId: true } },
			supervisedDelegationMembers: {
				columns: {},
				with: { delegation: { columns: { assignedRoleId: true } } }
			},
			supervisedSingleParticipants: { columns: { assignedRoleId: true } }
		}
	});
	return supervisors
		.filter(
			(supervisor) =>
				supervisor.supervisedDelegationMembers.some((member) => member.delegation.assignedRoleId) ||
				supervisor.supervisedSingleParticipants.some((single) => single.assignedRoleId)
		)
		.map((supervisor) => supervisor.participant.userId);
}

/** The delegations that hold a nation, with its code. */
async function nationDelegationsOf(conferenceId: string) {
	const delegations = await db.query.delegation.findMany({
		where: { conferenceId, assignedRole: { kind: 'NATION' } },
		columns: { memberCount: true },
		with: { assignedRole: { columns: { nationAlpha3Code: true } } }
	});
	return delegations.map((delegation) => ({
		code: delegation.assignedRole?.nationAlpha3Code ?? null,
		memberCount: delegation.memberCount
	}));
}

/** The bins of a conference's seated participants. Everyone who holds a seat gets a nametag. */
export async function loadNametagBins({
	conferenceId,
	binCount,
	language
}: {
	conferenceId: string;
	binCount: number;
	language: string;
}) {
	const [nationDelegations, nonStateActorDelegations, pressAndIndividuals, supervisors] =
		await Promise.all([
			nationDelegationsOf(conferenceId),
			db.query.delegation.findMany({
				where: { conferenceId, assignedRole: { kind: 'NON_STATE_ACTOR' } },
				columns: { memberCount: true }
			}),
			db.$count(
				schema.singleParticipant,
				and(
					inArray(
						schema.singleParticipant.conferenceParticipantId,
						db
							.select({ id: schema.conferenceParticipant.id })
							.from(schema.conferenceParticipant)
							.where(eq(schema.conferenceParticipant.conferenceId, conferenceId))
					),
					isNotNull(schema.singleParticipant.assignedRoleId)
				)
			),
			seatedSupervisorUserIds(conferenceId).then((ids) => ids.length)
		]);

	const letterCounts = nationDelegations.flatMap((delegation) =>
		delegation.code
			? [
					{
						letter: nationInitial({ alpha3Code: delegation.code, language }),
						count: delegation.memberCount
					}
				]
			: []
	);
	const others =
		pressAndIndividuals +
		supervisors +
		nonStateActorDelegations.reduce((sum, delegation) => sum + delegation.memberCount, 0);

	return splitIntoNametagBins({ letterCounts, others, binCount });
}

/** The nations sent to a bin of `letters`. */
async function nationGroups({
	conferenceId,
	letters,
	language
}: {
	conferenceId: string;
	letters: string[];
	language: string;
}): Promise<NametagBinGroup[]> {
	const delegations = await nationDelegationsOf(conferenceId);
	return delegations.flatMap(({ code, memberCount }) =>
		code && letters.includes(nationInitial({ alpha3Code: code, language }))
			? [nationGroup({ code, memberCount, language })]
			: []
	);
}

/** Everyone without a nation: non-state actors, roles and supervisors. */
async function otherGroups({
	conferenceId,
	language
}: {
	conferenceId: string;
	language: string;
}): Promise<NametagBinGroup[]> {
	const [nonStateActors, singles, supervisors] = await Promise.all([
		db.query.delegation.findMany({
			where: { conferenceId, assignedRole: { kind: 'NON_STATE_ACTOR' } },
			columns: { memberCount: true },
			with: { assignedRole: { columns: { name: true, fontAwesomeIcon: true } } }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, assignedRoleId: { isNotNull: true } },
			columns: {},
			with: { assignedRole: { columns: { name: true, fontAwesomeIcon: true } } }
		}),
		seatedSupervisorUserIds(conferenceId).then((ids) => ids.length)
	]);

	return [
		...nonStateActorGroups(nonStateActors),
		...singleRoleGroups({ singles, supervisors, language })
	];
}

/** The nations, non-state actors and roles sent to bin `index` of the split `loadNametagBins` makes. */
export async function loadNametagBinGroups({
	conferenceId,
	binCount,
	index,
	language
}: {
	conferenceId: string;
	binCount: number;
	index: number;
	language: string;
}): Promise<NametagBinGroup[]> {
	const bin = (await loadNametagBins({ conferenceId, binCount, language }))[index];
	if (!bin) return [];

	const nations =
		bin.letters.length > 0
			? await nationGroups({ conferenceId, letters: bin.letters, language })
			: [];
	const others = bin.otherParticipants > 0 ? await otherGroups({ conferenceId, language }) : [];
	return [...nations, ...others];
}

/**
 * The table `userId` fetches their nametag at, or `null` without a seat (not assigned yet, or not
 * part of the conference). Everyone with a nation goes by its first letter, everyone else to the
 * table that serves press, roles and non-state actors.
 */
async function loadOwnNametagTable({
	conferenceId,
	binCount,
	userId,
	language
}: {
	conferenceId: string;
	binCount: number;
	userId: string;
	language: string;
}): Promise<OwnNametagTable | null> {
	const [member, single, supervisor] = await Promise.all([
		db.query.delegationMember.findFirst({
			where: { participant: { conferenceId, userId } },
			columns: {},
			with: {
				delegation: {
					columns: { assignedRoleId: true },
					with: { assignedRole: { columns: { nationAlpha3Code: true } } }
				}
			}
		}),
		db.query.singleParticipant.findFirst({
			where: { participant: { conferenceId, userId } },
			columns: { assignedRoleId: true }
		}),
		seatedSupervisorUserIds(conferenceId).then((ids) => ids.includes(userId))
	]);

	const seat = ownSeat({ member, single, supervisor });
	if (!seat) return null;
	return ownNametagTable({
		bins: await loadNametagBins({ conferenceId, binCount, language }),
		seat,
		language
	});
}

/**
 * The table `userId` picks their nametag up at in the conference; `null` while they hold no seat
 * they may see, which is until the assignment is released.
 */
export async function ownNametagTableIn({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	const conference = await nametagConference(conferenceId);
	if (!conference.assignmentReleased) return null;
	return loadOwnNametagTable({
		conferenceId,
		binCount: conference.nametagBinCount,
		userId,
		language: conference.language
	});
}
