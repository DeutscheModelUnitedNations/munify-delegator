import {
	client,
	type AssignmentreviewWhereInputArgument,
	type DelegationWhereInputArgument,
	type SingleparticipantWhereInputArgument
} from '$lib/api/rumbleClient/client';
import { liveSnapshot } from '$lib/api/liveSnapshot';
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
	applied: true,
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
	applied: true,
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

/** A card's fields with the application's review, for rows read along with something else. */
const delegationCardWithReview = { ...delegationCard, assignmentReview: reviewFields } as const;
const singleCardWithReview = { ...singleCard, assignmentReview: reviewFields } as const;

/**
 * The draft of a conference, live: its units and the custom roles it plans, each with the
 * application it comes from and that application's review. One query, so a move on the board
 * arrives as one update: nothing has to be asked for afterwards, which would keep the page's
 * update pending (and a second move in that window left the board half updated).
 */
export async function fetchAssignmentDraft(conferenceId: string) {
	const [units, draftSingleRoles] = await Promise.all([
		client.liveQuery.assignmentUnits({
			__args: { where: inConference(conferenceId) },
			id: true,
			sourceDelegationId: true,
			sourceSingleParticipantId: true,
			nationAlpha3Code: true,
			nonStateActorId: true,
			members: { delegationMemberId: true },
			sourceDelegation: delegationCardWithReview,
			sourceSingleParticipant: singleCardWithReview
		}),
		client.liveQuery.assignmentSingleRoles({
			__args: { where: inConference(conferenceId) },
			singleParticipantId: true,
			roleId: true,
			singleParticipant: singleCardWithReview
		})
	]);
	return { units, draftSingleRoles };
}

type AssignmentDraft = Awaited<ReturnType<typeof fetchAssignmentDraft>>;

export interface ApplicationIds {
	delegationIds: readonly string[];
	singleParticipantIds: readonly string[];
}

/**
 * The applied delegations and single participants that hold a role, live, with their reviews.
 * Together with the applications the draft brings along (`seatedFrom`), that is everything the
 * roles, their seat counts and the plan of applying the draft depend on. It does not depend on
 * the draft, so a move on the board asks for nothing new.
 */
export async function fetchSeatedApplications(conferenceId: string) {
	const applied = { ...inConference(conferenceId), applied: { eq: true } };
	const [delegations, singleParticipants] = await Promise.all([
		client.liveQuery.delegations({
			__args: {
				where: {
					...applied,
					OR: [
						{ assignedNationAlpha3Code: { isNotNull: true } },
						{ assignedNonStateActorId: { isNotNull: true } }
					]
				}
			},
			...delegationCardWithReview
		}),
		client.liveQuery.singleParticipants({
			__args: { where: { ...applied, assignedRoleId: { isNotNull: true } } },
			...singleCardWithReview
		})
	]);
	return { delegations, singleParticipants };
}

type SeatedApplications = Awaited<ReturnType<typeof fetchSeatedApplications>>;

type WithReview<T> = T & { assignmentReview?: BoardReviewRow | null };

/**
 * The applications that hold a role or that the draft touches, as plain rows, and their reviews
 * collected: the seated ones and the ones the draft's units and single roles bring along. Applications
 * no longer applied are left out; one listed twice counts once.
 */
export function seatedFrom(input: {
	delegations: readonly WithReview<BoardDelegation>[];
	singleParticipants: readonly WithReview<BoardSingleParticipant>[];
	units: readonly {
		sourceDelegation?: WithReview<BoardDelegation> | null;
		sourceSingleParticipant?: WithReview<BoardSingleParticipant> | null;
	}[];
	draftSingleRoles: readonly { singleParticipant?: WithReview<BoardSingleParticipant> | null }[];
}) {
	const delegations = new Map<string, BoardDelegation>();
	const singleParticipants = new Map<string, BoardSingleParticipant>();
	const reviews: BoardReviewRow[] = [];
	const add = <T extends { id: string; applied: boolean }>(
		into: Map<string, T>,
		row: WithReview<T> | null | undefined
	) => {
		if (!row?.applied || into.has(row.id)) return;
		// Kept with its review attached: the extra field is harmless to everything reading the row.
		into.set(row.id, row);
		if (row.assignmentReview) reviews.push(row.assignmentReview);
	};
	for (const row of input.delegations) add(delegations, row);
	for (const unit of input.units) add(delegations, unit.sourceDelegation);
	for (const row of input.singleParticipants) add(singleParticipants, row);
	for (const unit of input.units) add(singleParticipants, unit.sourceSingleParticipant);
	for (const role of input.draftSingleRoles) add(singleParticipants, role.singleParticipant);
	return {
		delegations: [...delegations.values()],
		singleParticipants: [...singleParticipants.values()],
		reviews
	};
}

/**
 * Plain copies of the draft and the seated applications, joined (`seatedFrom`): what the
 * assignment tabs work over. Create one per component and call it in a `$derived`; each live
 * result is read once, and an unchanged one keeps its copy (see `liveSnapshot`).
 */
export function seatedSnapshot() {
	const snapshot = {
		units: liveSnapshot<AssignmentDraft['units'][number]>(),
		draftSingleRoles: liveSnapshot<AssignmentDraft['draftSingleRoles'][number]>(),
		delegations: liveSnapshot<SeatedApplications['delegations'][number]>(),
		singles: liveSnapshot<SeatedApplications['singleParticipants'][number]>()
	};
	return (draft: AssignmentDraft, seated: SeatedApplications) => {
		const units = snapshot.units(draft.units);
		const draftSingleRoles = snapshot.draftSingleRoles(draft.draftSingleRoles);
		return {
			units,
			draftSingleRoles,
			...seatedFrom({
				delegations: snapshot.delegations(seated.delegations),
				singleParticipants: snapshot.singles(seated.singleParticipants),
				units,
				draftSingleRoles
			})
		};
	};
}

/** The reviews of the given applications, live. */
function fetchReviewsOf(conferenceId: string, ids: ApplicationIds) {
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

type PoolEntry<T> = { row: T; review: BoardReviewRow | null };

/**
 * One page of a pool, ordered by the backend: the rated applications best first (read through
 * their reviews, the only way to order by the rating), then the rest by id, so every row on a
 * page is one the board shows. Read once and copied out of the query results, so a page is never
 * asked for or read again. Not live, which the board does not need: whatever the draft or applying
 * changes about these applications reaches it through `fetchSeatedApplications`, which is.
 */
async function ratedFirstPage<T>(
	page: number,
	source: {
		countRated: () => Promise<number>;
		rated: (offset: number) => Promise<PoolEntry<T>[]>;
		unrated: (paging: { limit: number; offset: number }) => Promise<PoolEntry<T>[]>;
	}
): Promise<PoolPage<T>> {
	const offset = page * POOL_PAGE;
	const ratedCount = await source.countRated();
	const entries = offset < ratedCount ? await source.rated(offset) : [];
	if (entries.length < POOL_PAGE) {
		entries.push(
			...(await source.unrated({
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

/** One page of a pool of delegations, best rated first (see `ratedFirstPage`). */
export function fetchDelegationPoolPage(
	conferenceId: string,
	filter: DelegationPoolFilter,
	page: number
): Promise<PoolPage<BoardDelegation>> {
	return ratedFirstPage(page, {
		countRated: async () =>
			Number(
				await client.query.assignmentReviewsCount({
					__args: { where: ratedPoolWhere(conferenceId, filter) }
				})
			),
		rated: (offset) => ratedPoolRows(conferenceId, filter, offset),
		unrated: (paging) => unratedPoolRows(conferenceId, filter, paging)
	});
}

/**
 * How many delegations the pool holds per group size, counted by the backend: the largest size
 * first, then one count per size (an index on the conference and the size serves both), so the
 * size tabs know every size there is without the delegations being read. It does not depend on
 * the draft (`poolCountsBesidesDraft` takes the touched delegations out), so a move on the board
 * asks for nothing new.
 */
export async function fetchDelegationPoolSizes(conferenceId: string, showDisqualified: boolean) {
	const where = (size?: number) => delegationPoolWhere(conferenceId, { size, showDisqualified });
	const [largest] = await client.query.delegations({
		__args: { where: where(), orderBy: { memberCount: 'desc' }, limit: 1 },
		memberCount: true
	});
	const sizes = Array.from({ length: largest?.memberCount ?? 0 }, (_, index) => index + 1);
	const counts = await Promise.all(
		sizes.map((size) => client.query.delegationsCount({ __args: { where: where(size) } }))
	);
	return new Map(sizes.map((size, index) => [size, Number(counts[index])]));
}

/** The single participants of the pool: applied, without a custom role. */
const singlePoolWhere = (conferenceId: string): SingleparticipantWhereInputArgument => ({
	...inConference(conferenceId),
	applied: { eq: true },
	assignedRoleId: { isNull: true }
});

const ratedSinglesWhere = (conferenceId: string): AssignmentreviewWhereInputArgument => ({
	...inConference(conferenceId),
	evaluation: { isNotNull: true },
	singleParticipant: singlePoolWhere(conferenceId)
});

/** One page of the single participants without a role, best rated first (see `ratedFirstPage`). */
export function fetchSinglePoolPage(
	conferenceId: string,
	page: number
): Promise<PoolPage<BoardSingleParticipant>> {
	return ratedFirstPage(page, {
		countRated: async () =>
			Number(
				await client.query.assignmentReviewsCount({
					__args: { where: ratedSinglesWhere(conferenceId) }
				})
			),
		rated: async (offset) => {
			const rated = await client.query.assignmentReviews({
				__args: {
					where: ratedSinglesWhere(conferenceId),
					orderBy: { evaluation: 'desc', singleParticipantId: 'asc' },
					limit: POOL_PAGE,
					offset
				},
				...reviewFields,
				singleParticipant: singleCard
			});
			return [...rated].flatMap(({ singleParticipant, ...review }) =>
				singleParticipant ? [{ row: singleParticipant, review }] : []
			);
		},
		unrated: async (paging) => {
			const unrated = await client.query.singleParticipants({
				__args: {
					where: {
						AND: [
							singlePoolWhere(conferenceId),
							{ NOT: { assignmentReview: { evaluation: { isNotNull: true } } } }
						]
					},
					orderBy: { id: 'asc' },
					...paging
				},
				...singleCard,
				assignmentReview: reviewFields
			});
			return [...unrated].map(({ assignmentReview, ...row }) => ({
				row,
				review: assignmentReview
			}));
		}
	});
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
