import getNationRegionalGroup from '$lib/helpers/getNationRegionalGroup';

/** Builds the import file munify-chase reads (the input of `src/api/handlers/import.ts` there). */

type Maybe<T> = T | null | undefined;

interface ExportUser {
	email: string | null;
	givenName: string | null;
	familyName: string | null;
}

interface ExportDelegationMember {
	id: string;
	assignedCommittee?: Maybe<{ id: string }>;
	user: ExportUser;
	delegation?: Maybe<{
		assignedNation?: Maybe<{ alpha3Code: string }>;
		assignedNonStateActor?: Maybe<{ id: string }>;
	}>;
}

export interface ChaseConferenceData {
	id: string;
	title: string;
	committees: readonly {
		id: string;
		name: string;
		abbreviation: string;
		agendaItems: readonly { id: string; title: string }[];
	}[];
	singleParticipants: readonly {
		id: string;
		user: ExportUser;
		assignedRole?: Maybe<{ id: string }>;
	}[];
	conferenceSupervisors: readonly { id: string; user: ExportUser }[];
	nonStateActors: readonly { id: string; name: string; fontAwesomeIcon?: Maybe<string> }[];
	delegationMembers: readonly ExportDelegationMember[];
	teamMembers: readonly { id: string; role: string; user: ExportUser }[];
}

interface ExportNation {
	alpha2Code: string;
	alpha3Code: string;
}

/** "Given Family", or `undefined` when the user has neither. */
export function composeUserName(user: Pick<ExportUser, 'givenName' | 'familyName'>) {
	const name = `${user.givenName ?? ''} ${user.familyName ?? ''}`.trim();
	return name.length > 0 ? name : undefined;
}

const regionalGroups = new Map<string | undefined, string>([
	['African Group', 'AFRICA'],
	['Asia and the Pacific Group', 'ASIA_PACIFIC'],
	['Eastern European Group', 'EASTERN_EUROPE'],
	['Latin American and Caribbean Group', 'LATIN_AMERICA_CARIBBEAN'],
	['Western European and Others Group', 'WESTERN_EUROPE_OTHERS']
]);

/** Chase's enum value for a UN regional group name. */
export function transformRegionalGroup(regionalGroup: string | undefined) {
	return regionalGroups.get(regionalGroup);
}

function nationOf(dm: ExportDelegationMember) {
	return dm.delegation?.assignedNation?.alpha3Code;
}

function nonStateActorOf(dm: ExportDelegationMember) {
	return dm.delegation?.assignedNonStateActor?.id;
}

/** One committee member per (nation, committee) pair, keyed `<alpha3Code>_<committeeId>`. */
function committeeMemberKey(dm: ExportDelegationMember) {
	const alpha3Code = nationOf(dm);
	const committeeId = dm.assignedCommittee?.id;
	if (!alpha3Code || !committeeId) return undefined;
	return { key: `${alpha3Code}_${committeeId}`, alpha3Code, committeeId };
}

/**
 * The chase import for a conference. Every nation becomes a representation with a fresh id from
 * `newId`, and delegates of the same nation in the same committee share one committee member.
 */
export function buildChaseImport(
	conferenceData: ChaseConferenceData,
	nations: readonly ExportNation[],
	newId: () => string
) {
	// Build representation ID map first (needed by committeeMembers)
	const representationAlpha3CodeToIdMap = new Map<string, string>();
	const representations = [
		...nations.map((nation) => {
			const id = newId();
			representationAlpha3CodeToIdMap.set(nation.alpha3Code, id);
			return {
				id,
				representationType: 'DELEGATION',
				alpha3Code: nation.alpha3Code,
				alpha2Code: nation.alpha2Code,
				regionalGroup: transformRegionalGroup(getNationRegionalGroup(nation.alpha3Code))
			};
		}),
		...conferenceData.nonStateActors.map((nonStateActor) => ({
			id: nonStateActor.id,
			representationType: 'NSA',
			name: nonStateActor.name,
			faIcon: nonStateActor.fontAwesomeIcon
		}))
	];

	const committeeMemberIdMap = new Map<string, string>();
	const committeeMembers: {
		id: string;
		representationId: string | undefined;
		committeeId: string | undefined;
	}[] = [];
	for (const dm of conferenceData.delegationMembers) {
		const pair = committeeMemberKey(dm);
		if (!pair || committeeMemberIdMap.has(pair.key)) continue;
		const id = newId();
		committeeMemberIdMap.set(pair.key, id);
		committeeMembers.push({
			id,
			representationId: representationAlpha3CodeToIdMap.get(pair.alpha3Code),
			committeeId: pair.committeeId
		});
	}

	const nsaMembers = conferenceData.delegationMembers.filter(nonStateActorOf);
	const delegates = conferenceData.delegationMembers.filter(committeeMemberKey);

	return {
		$schema: 'https://chase.munify.cloud/api/schema/import',
		id: conferenceData.id,
		title: conferenceData.title,
		committees: conferenceData.committees.map((committee) => ({
			id: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation
		})),
		representations,
		conferenceMembers: nsaMembers.map((delegationMember) => ({
			id: delegationMember.id,
			representationId: nonStateActorOf(delegationMember)
		})),
		committeeMembers,
		conferenceUsers: [
			...conferenceData.teamMembers.map((teamMember) => ({
				id: teamMember.id,
				conferenceUserType: teamMember.role === 'PROJECT_MANAGEMENT' ? 'ADMIN' : 'TEAM',
				userEmail: teamMember.user.email,
				name: composeUserName(teamMember.user)
			})),
			...conferenceData.conferenceSupervisors.map((supervisor) => ({
				id: supervisor.id,
				conferenceUserType: 'SPECTATOR',
				userEmail: supervisor.user.email,
				name: composeUserName(supervisor.user)
			})),
			...nsaMembers.map((delegationMember) => ({
				id: `${delegationMember.id}_user`,
				conferenceUserType: 'NON_STATE_ACTOR',
				userEmail: delegationMember.user.email,
				name: composeUserName(delegationMember.user),
				conferenceMemberId: delegationMember.id
			})),
			...delegates.map((delegationMember) => ({
				id: `${delegationMember.id}_user`,
				conferenceUserType: 'DELEGATE',
				userEmail: delegationMember.user.email,
				name: composeUserName(delegationMember.user),
				committeeMemberId: committeeMemberIdMap.get(committeeMemberKey(delegationMember)?.key ?? '')
			})),
			...conferenceData.singleParticipants
				.filter((sp) => sp.assignedRole?.id)
				.map((sp) => ({
					id: sp.id,
					conferenceUserType: 'SPECTATOR',
					userEmail: sp.user.email,
					name: composeUserName(sp.user)
				}))
		],
		agendaItems: conferenceData.committees.flatMap((committee) =>
			committee.agendaItems.map((item) => ({
				id: item.id,
				committeeId: committee.id,
				title: item.title
			}))
		)
	};
}
