import {
	client,
	type AssignmentreviewWhereInputArgument,
	type DelegationWhereInputArgument,
	type SingleparticipantWhereInputArgument
} from '$lib/api/rumbleClient/client';
import type { BoardReviewRow } from '$lib/assignment/board';

/*
 * The assignment tabs never read a whole conference: it can hold tens of thousands of
 * applications. They read the draft, the applications that hold a role or that the draft touches
 * (bounded by the seats and the size of the draft), and the pools of applications without a role
 * one page at a time, as their lists scroll.
 */

/** How many applications one page of a pool reads. */
export const POOL_PAGE = 250;

const inConference = (conferenceId: string) => ({ conferenceId: { eq: conferenceId } });

/** What the board shows of a delegation. */
const delegationCard = {
	id: true,
	school: true,
	assignedNationAlpha3Code: true,
	assignedNonStateActorId: true,
	members: {
		id: true,
		isHeadDelegate: true,
		user: { givenName: true, familyName: true }
	},
	appliedForRoles: {
		rank: true,
		nation: { alpha3Code: true },
		nonStateActor: { id: true, abbreviation: true }
	}
} as const;

/** What the board shows of a single participant. */
const singleCard = {
	id: true,
	school: true,
	assignedRoleId: true,
	user: { givenName: true, familyName: true },
	appliedForRoles: { id: true, name: true }
} as const;

const reviewFields = {
	delegationId: true,
	singleParticipantId: true,
	evaluation: true,
	flagged: true,
	disqualified: true,
	note: true
} as const;

/** The delegations matching `where`, live. */
function fetchBoardDelegations(where: DelegationWhereInputArgument) {
	return client.liveQuery.delegations({ __args: { where }, ...delegationCard });
}

/** The single participants matching `where`, live. */
function fetchBoardSingleParticipants(where: SingleparticipantWhereInputArgument) {
	return client.liveQuery.singleParticipants({ __args: { where }, ...singleCard });
}

function fetchReviews(where: AssignmentreviewWhereInputArgument) {
	return client.liveQuery.assignmentReviews({ __args: { where }, ...reviewFields });
}

/** The draft of a conference: its units and the custom roles it plans, live. */
export async function fetchAssignmentDraft(conferenceId: string) {
	const [units, draftSingleRoles] = await Promise.all([
		client.liveQuery.assignmentUnits({
			__args: { where: inConference(conferenceId) },
			id: true,
			sourceDelegationId: true,
			sourceSingleParticipantId: true,
			nationAlpha3Code: true,
			nonStateActorId: true,
			members: { delegationMemberId: true }
		}),
		client.liveQuery.assignmentSingleRoles({
			__args: { where: inConference(conferenceId) },
			singleParticipantId: true,
			roleId: true
		})
	]);
	return { units, draftSingleRoles };
}

export type AssignmentDraft = Awaited<ReturnType<typeof fetchAssignmentDraft>>;

const sortedUnique = (ids: Iterable<string>) => [...new Set(ids)].sort();

/** The applications the draft touches, sorted so equal drafts ask the same queries. */
export function draftApplicationIds(draft: AssignmentDraft) {
	return {
		delegationIds: sortedUnique(draft.units.flatMap((unit) => unit.sourceDelegationId ?? [])),
		singleParticipantIds: sortedUnique([
			...draft.units.flatMap((unit) => unit.sourceSingleParticipantId ?? []),
			...draft.draftSingleRoles.map((role) => role.singleParticipantId)
		])
	};
}

export interface ApplicationIds {
	delegationIds: readonly string[];
	singleParticipantIds: readonly string[];
}

/**
 * The applied delegations and single participants that hold a role or that the draft touches,
 * live: everything the roles, their seat counts and the plan of applying the draft depend on. The
 * applications without a role that the draft leaves alone change none of that.
 */
export async function fetchSeatedApplications(conferenceId: string, touched: ApplicationIds) {
	const applied = { ...inConference(conferenceId), applied: { eq: true } };
	const [delegations, singleParticipants] = await Promise.all([
		fetchBoardDelegations({
			...applied,
			OR: [
				{ assignedNationAlpha3Code: { isNotNull: true } },
				{ assignedNonStateActorId: { isNotNull: true } },
				{ id: { in: [...touched.delegationIds] } }
			]
		}),
		fetchBoardSingleParticipants({
			...applied,
			OR: [
				{ assignedRoleId: { isNotNull: true } },
				{ id: { in: [...touched.singleParticipantIds] } }
			]
		})
	]);
	return { delegations, singleParticipants };
}

/** The ids of the given rows, sorted, to read their reviews by. */
export const idsOf = (rows: readonly { id: string }[]) => sortedUnique(rows.map((row) => row.id));

/** The reviews of the given applications, live. */
export function fetchReviewsOf(conferenceId: string, ids: ApplicationIds) {
	return fetchReviews({
		...inConference(conferenceId),
		OR: [
			{ delegationId: { in: [...ids.delegationIds] } },
			{ singleParticipantId: { in: [...ids.singleParticipantIds] } }
		]
	});
}

/** The reviews of many applications, read a page of ids at a time (for the exports). */
export async function fetchReviewsOfMany(conferenceId: string, ids: ApplicationIds) {
	const pages: ApplicationIds[] = [];
	for (let start = 0; start < ids.delegationIds.length; start += POOL_PAGE) {
		const delegationIds = ids.delegationIds.slice(start, start + POOL_PAGE);
		pages.push({ delegationIds, singleParticipantIds: [] });
	}
	for (let start = 0; start < ids.singleParticipantIds.length; start += POOL_PAGE) {
		const singleParticipantIds = ids.singleParticipantIds.slice(start, start + POOL_PAGE);
		pages.push({ delegationIds: [], singleParticipantIds });
	}
	return (await Promise.all(pages.map((page) => fetchReviewsOf(conferenceId, page)))).flat();
}

const pageArgs = (page: number) => ({
	limit: POOL_PAGE,
	offset: page * POOL_PAGE,
	orderBy: { id: 'asc' as const }
});

/**
 * The reviews of one page of a pool, read once and copied out of the query result like the page
 * itself (see `fetchDelegationPoolPage`).
 */
async function pageReviews(conferenceId: string, ids: ApplicationIds) {
	const reviews = await client.query.assignmentReviews({
		__args: {
			where: {
				...inConference(conferenceId),
				OR: [
					{ delegationId: { in: [...ids.delegationIds] } },
					{ singleParticipantId: { in: [...ids.singleParticipantIds] } }
				]
			}
		},
		...reviewFields
	});
	return [...reviews];
}

/** Which pool of delegations the board shows. */
export interface DelegationPoolFilter {
	size: number;
	showDisqualified: boolean;
}

/**
 * The delegations of a pool, as the backend filters them: applied, without a live role, of the
 * group size shown (any, without one) and, unless shown, not excluded by the team.
 */
function delegationPoolWhere(
	conferenceId: string,
	filter: { size?: number; showDisqualified: boolean }
): DelegationWhereInputArgument {
	return {
		...inConference(conferenceId),
		applied: { eq: true },
		assignedNationAlpha3Code: { isNull: true },
		assignedNonStateActorId: { isNull: true },
		...(filter.size === undefined ? {} : { memberCount: { eq: filter.size } }),
		...(filter.showDisqualified
			? {}
			: { NOT: { assignmentReview: { disqualified: { eq: true } } } })
	};
}

/** The rated delegations of a pool, through their reviews: the only way to order by the rating. */
const ratedPoolWhere = (
	conferenceId: string,
	filter: DelegationPoolFilter
): AssignmentreviewWhereInputArgument => ({
	...inConference(conferenceId),
	evaluation: { isNotNull: true },
	delegation: delegationPoolWhere(conferenceId, filter)
});

/** The rated part of one page, best rated first, starting at `offset` of the rated ones. */
async function ratedPoolRows(conferenceId: string, filter: DelegationPoolFilter, offset: number) {
	const rated = await client.query.assignmentReviews({
		__args: {
			where: ratedPoolWhere(conferenceId, filter),
			orderBy: { evaluation: 'desc', delegationId: 'asc' },
			limit: POOL_PAGE,
			offset
		},
		...reviewFields,
		delegation: delegationCard
	});
	return [...rated].flatMap(({ delegation, ...review }) =>
		delegation ? [{ row: delegation, review }] : []
	);
}

/** The unrated part of a page: the rest of the pool by id, with the reviews some of them have. */
async function unratedPoolRows(
	conferenceId: string,
	filter: DelegationPoolFilter,
	paging: { limit: number; offset: number }
) {
	const unrated = await client.query.delegations({
		__args: {
			where: {
				AND: [
					delegationPoolWhere(conferenceId, filter),
					{ NOT: { assignmentReview: { evaluation: { isNotNull: true } } } }
				]
			},
			orderBy: { id: 'asc' },
			...paging
		},
		...delegationCard,
		assignmentReview: reviewFields
	});
	return [...unrated].map(({ assignmentReview, ...row }) => ({ row, review: assignmentReview }));
}

/**
 * One page of a pool of delegations, filtered and ordered by the backend: the rated ones best
 * first, then the rest by id, so every delegation on a page is one the board shows. Read once and
 * copied out of the query results, so a page is never asked for or read again. Not live, which
 * the board does not need: whatever the draft or applying changes about these delegations reaches
 * it through `fetchSeatedApplications`, which is.
 */
export async function fetchDelegationPoolPage(
	conferenceId: string,
	filter: DelegationPoolFilter,
	page: number
): Promise<PoolPage<BoardDelegation>> {
	const offset = page * POOL_PAGE;
	const ratedCount = Number(
		await client.query.assignmentReviewsCount({
			__args: { where: ratedPoolWhere(conferenceId, filter) }
		})
	);
	const entries: { row: BoardDelegation; review: BoardReviewRow | null }[] =
		offset < ratedCount ? await ratedPoolRows(conferenceId, filter, offset) : [];
	if (entries.length < POOL_PAGE) {
		entries.push(
			...(await unratedPoolRows(conferenceId, filter, {
				limit: POOL_PAGE - entries.length,
				offset: Math.max(0, offset - ratedCount)
			}))
		);
	}
	return {
		rows: entries.map(({ row }) => row),
		reviews: entries.flatMap(({ review }) => (review ? [review] : []))
	};
}

/**
 * How many delegations the pool holds per group size, counted by the backend, leaving out those
 * the draft touches: they reach the board through `fetchSeatedApplications` and count there. The
 * largest size comes first, then one count per size (an index on the conference and the size
 * serves both), so the size tabs know every size there is without the delegations being read.
 */
export async function fetchDelegationPoolSizes(
	conferenceId: string,
	showDisqualified: boolean,
	touchedDelegationIds: readonly string[]
) {
	const where = (size?: number): DelegationWhereInputArgument => ({
		AND: [
			delegationPoolWhere(conferenceId, { size, showDisqualified }),
			{ NOT: { id: { in: [...touchedDelegationIds] } } }
		]
	});
	const [largest] = await client.query.delegations({
		__args: { where: where(), orderBy: { memberCount: 'desc' }, limit: 1 },
		memberCount: true
	});
	const sizes = Array.from({ length: largest?.memberCount ?? 0 }, (_, index) => index + 1);
	const counts = await Promise.all(
		sizes.map((size) => client.liveQuery.delegationsCount({ __args: { where: where(size) } }))
	);
	return new Map(sizes.map((size, index) => [size, Number(counts[index])]));
}

/** One page of the applied single participants without a live role; see `fetchDelegationPoolPage`. */
export async function fetchSinglePoolPage(conferenceId: string, page: number) {
	const rows = await client.query.singleParticipants({
		__args: {
			where: {
				...inConference(conferenceId),
				applied: { eq: true },
				assignedRoleId: { isNull: true }
			},
			...pageArgs(page)
		},
		...singleCard
	});
	const plain = [...rows];
	const reviews = await pageReviews(conferenceId, {
		delegationIds: [],
		singleParticipantIds: idsOf(plain)
	});
	return { rows: plain, reviews };
}

export type PoolPage<T> = { rows: T[]; reviews: BoardReviewRow[] };

/** The review of one delegation or single participant, live. */
export async function fetchReviewOf(
	conferenceId: string,
	application: { delegationId?: string; singleParticipantId?: string }
) {
	const reviews = await fetchReviews({
		...inConference(conferenceId),
		...(application.delegationId
			? { delegationId: { eq: application.delegationId } }
			: { singleParticipantId: { eq: application.singleParticipantId ?? '' } })
	});
	return reviews.at(0);
}

export type BoardDelegation = Awaited<ReturnType<typeof fetchBoardDelegations>>[number];
export type BoardSingleParticipant = Awaited<
	ReturnType<typeof fetchBoardSingleParticipants>
>[number];
export type BoardReview = Awaited<ReturnType<typeof fetchReviews>>[number];

/** The nations, non-state actors and custom roles of a conference, with their seats. */
export async function fetchAssignmentRoles(conferenceId: string) {
	const inConference = { where: { conferenceId: { eq: conferenceId } } };
	const [committees, nonStateActors, customRoles] = await Promise.all([
		client.liveQuery.committees({
			__args: inConference,
			abbreviation: true,
			numOfSeatsPerDelegation: true,
			nations: { alpha2Code: true, alpha3Code: true }
		}),
		client.liveQuery.nonStateActors({
			__args: inConference,
			id: true,
			name: true,
			abbreviation: true,
			fontAwesomeIcon: true,
			seatAmount: true
		}),
		client.liveQuery.customConferenceRoles({
			__args: inConference,
			id: true,
			name: true,
			fontAwesomeIcon: true,
			seatAmount: true
		})
	]);
	return { committees, nonStateActors, customRoles };
}
