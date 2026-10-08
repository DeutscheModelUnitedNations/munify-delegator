import { seatedRoles } from './capacity';
import {
	assignmentGroups,
	occupancy,
	singleRoles,
	targetKey,
	type AssignmentGroup,
	type DraftUnit,
	type LiveDelegation,
	type LiveSingleParticipant,
	type Target
} from './state';

/**
 * What the assignment board shows, worked out from the rows its live queries return. Pure, so the
 * decisions behind the board (which groups are open, where a drop goes, which mutation plans a
 * role) are tested here rather than in the components.
 */

type Nullable<T> = T | null | undefined;

export interface BoardReviewRow {
	delegationId?: Nullable<string>;
	singleParticipantId?: Nullable<string>;
	evaluation?: Nullable<number>;
	flagged: boolean;
	disqualified: boolean;
	note?: Nullable<string>;
}

export interface BoardRows {
	delegations: readonly {
		id: string;
		assignedNationAlpha3Code?: Nullable<string>;
		assignedNonStateActorId?: Nullable<string>;
		members: readonly { id: string; isHeadDelegate: boolean }[];
	}[];
	singleParticipants: readonly { id: string; assignedRoleId?: Nullable<string> }[];
	units: readonly {
		id: string;
		sourceDelegationId?: Nullable<string>;
		sourceSingleParticipantId?: Nullable<string>;
		nationAlpha3Code?: Nullable<string>;
		nonStateActorId?: Nullable<string>;
		members: readonly { delegationMemberId: string }[];
	}[];
	draftSingleRoles: readonly { singleParticipantId: string; roleId?: Nullable<string> }[];
	reviews: readonly BoardReviewRow[];
}

export interface BoardRoles {
	committees: readonly {
		abbreviation: string;
		numOfSeatsPerDelegation: number;
		nations: readonly { alpha2Code: string; alpha3Code: string }[];
	}[];
	nonStateActors: readonly {
		id: string;
		name: string;
		abbreviation: string;
		fontAwesomeIcon?: Nullable<string>;
		seatAmount: number;
	}[];
}

const orNull = <T>(value: Nullable<T>) => value ?? null;

const targetOf = (row: {
	nationAlpha3Code?: Nullable<string>;
	nonStateActorId?: Nullable<string>;
}): Target => ({
	nationAlpha3Code: orNull(row.nationAlpha3Code),
	nonStateActorId: orNull(row.nonStateActorId)
});

function liveDelegation(delegation: BoardRows['delegations'][number]): LiveDelegation {
	return {
		id: delegation.id,
		...targetOf({
			nationAlpha3Code: delegation.assignedNationAlpha3Code,
			nonStateActorId: delegation.assignedNonStateActorId
		}),
		members: delegation.members.map(({ id, isHeadDelegate }) => ({ id, isHeadDelegate }))
	};
}

function draftUnit(unit: BoardRows['units'][number]): DraftUnit {
	return {
		id: unit.id,
		sourceDelegationId: orNull(unit.sourceDelegationId),
		sourceSingleParticipantId: orNull(unit.sourceSingleParticipantId),
		...targetOf(unit),
		memberIds: unit.members.map((member) => member.delegationMemberId)
	};
}

/** The live rows in the plain shapes the pure assignment logic takes. */
function liveState(rows: Omit<BoardRows, 'reviews'>) {
	const singleParticipants: LiveSingleParticipant[] = rows.singleParticipants.map((single) => ({
		id: single.id,
		roleId: orNull(single.assignedRoleId)
	}));
	const draftSingleRoles = rows.draftSingleRoles.map((entry) => ({
		singleParticipantId: entry.singleParticipantId,
		roleId: orNull(entry.roleId)
	}));
	return {
		delegations: rows.delegations.map(liveDelegation),
		singleParticipants,
		units: rows.units.map(draftUnit),
		draftSingleRoles
	};
}

/** Delegation or single participant: the application a review or a group belongs to. */
const applicationKey = (row: {
	delegationId?: Nullable<string>;
	singleParticipantId?: Nullable<string>;
}) => row.delegationId ?? row.singleParticipantId ?? '';

/** The review of the application a group or single participant comes from. */
function reviewLookup<R extends BoardReviewRow>(reviews: readonly R[]) {
	const byApplication = new Map(reviews.map((review) => [applicationKey(review), review]));
	return (group: Pick<AssignmentGroup, 'delegationId' | 'singleParticipantId'>) =>
		byApplication.get(applicationKey(group));
}

/** Everything the board shows, worked out from the live rows and the draft. */
export function boardState<R extends BoardRows>(rows: R, roles: BoardRoles) {
	const live = liveState(rows);
	const { groups, incompleteSplits } = assignmentGroups(
		live.delegations,
		live.singleParticipants,
		live.units
	);
	const converted = new Set(groups.flatMap((group) => group.singleParticipantId ?? []));
	return {
		live,
		groups,
		incompleteSplits,
		seated: seatedRoles(roles.committees, roles.nonStateActors),
		taken: occupancy(groups),
		singles: singleRoles(live.singleParticipants, live.draftSingleRoles, converted),
		reviewOf: reviewLookup<R['reviews'][number]>(rows.reviews)
	};
}

export type BoardState = ReturnType<typeof boardState>;

/** How many groups and single participants applying the draft would change. */
export function pendingCount(rows: Omit<BoardRows, 'reviews'>) {
	const live = liveState(rows);
	const { groups } = assignmentGroups(live.delegations, live.singleParticipants, live.units);
	const converted = new Set(groups.flatMap((group) => group.singleParticipantId ?? []));
	const singles = singleRoles(live.singleParticipants, live.draftSingleRoles, converted);
	return [...groups, ...singles].filter((entry) => entry.pending).length;
}

/** Free seats of a role on the board. */
export const freeSeats = (view: BoardState, role: { key: string; seats: number }) =>
	role.seats - (view.taken.get(role.key) ?? 0);

/** Whether a group (if any) is planned to hold a role. */
export const hasRole = (group: AssignmentGroup | undefined) => !!group && !!targetKey(group.target);

/** A group still waiting for a role that the automatic assignment would consider. */
const isOpen = (view: BoardState, group: AssignmentGroup) =>
	!targetKey(group.target) && !view.reviewOf(group)?.disqualified;

/**
 * Every size a group or a role comes in, with how many groups are open and roles not yet full.
 * `poolCounts` adds the open groups the board has not loaded, as the backend counted them per size.
 */
export function sizeOptions(view: BoardState, poolCounts: ReadonlyMap<number, number> = new Map()) {
	const sizes = new Set([
		...view.groups.map((g) => g.size),
		...view.seated.map((r) => r.seats),
		...[...poolCounts].flatMap(([size, count]) => (count > 0 ? [size] : []))
	]);
	return [...sizes]
		.sort((a, b) => a - b)
		.map((size) => ({
			size,
			openGroups:
				view.groups.filter((g) => g.size === size && isOpen(view, g)).length +
				(poolCounts.get(size) ?? 0),
			unfilledRoles: view.seated.filter((r) => r.seats === size && freeSeats(view, r) > 0).length
		}));
}

/** The size asked for, else the first with open groups, else the smallest. */
export function pickSize(options: readonly { size: number; openGroups: number }[], asked: number) {
	if (asked) return asked;
	const open = options.find((option) => option.openGroups > 0);
	return (open ?? options[0])?.size ?? 0;
}

/**
 * The groups of one size without a role, in the order they are given: the backend delivers the
 * pool ordered (best rated first), so nothing is sorted here.
 */
export function poolGroups(view: BoardState, size: number, showDisqualified: boolean) {
	return view.groups.filter(
		(group) =>
			group.size === size &&
			!targetKey(group.target) &&
			(showDisqualified || !view.reviewOf(group)?.disqualified)
	);
}

/**
 * Groups in the order of the pages their applications were loaded from, keeping their order within
 * a page, so a pool read page by page does not reshuffle as it grows. Groups whose application is on
 * no page (the draft moved them back from a role) come first.
 */
export function inPageOrder(
	groups: readonly AssignmentGroup[],
	pages: readonly (readonly { id: string }[])[]
) {
	const pageOf = new Map(
		pages.flatMap((page, index) => page.map((row) => [row.id, index] as const))
	);
	const position = (group: AssignmentGroup) =>
		pageOf.get(group.delegationId ?? group.singleParticipantId ?? '') ?? -1;
	return groups.toSorted((a, b) => position(a) - position(b));
}

/** The roles with `seats` seats, with the groups planned onto each. */
export function rolesWithSeats(view: BoardState, seats: number) {
	return view.seated
		.filter((role) => role.seats === seats)
		.map((role) => ({
			...role,
			taken: view.taken.get(role.key) ?? 0,
			groups: view.groups.filter((group) => targetKey(group.target) === role.key)
		}));
}

export const POOL_CONTAINER = 'pool';
export const roleContainer = (key: string) => `role:${key}`;

export type DropAction =
	{ type: 'assign'; group: AssignmentGroup; target: Target | null } | { type: 'full' };

/** What dropping the group `groupKey` into `container` does, if anything. */
export function dropAction(
	view: BoardState,
	groupKey: string,
	source: string,
	container: string | null
): DropAction | undefined {
	const group = view.groups.find((candidate) => candidate.key === groupKey);
	if (!group || !container || container === source) return undefined;
	if (container === POOL_CONTAINER) return { type: 'assign', group, target: null };
	const role = view.seated.find((candidate) => roleContainer(candidate.key) === container);
	if (!role) return undefined;
	if (freeSeats(view, role) < group.size) return { type: 'full' };
	return { type: 'assign', group, target: role.target };
}

/**
 * Which mutation plans a role for a group: parts of a split delegation and converted single
 * participants through their own unit, whole delegations as such.
 */
export function assignmentMutation(group: AssignmentGroup) {
	const ownUnit = group.part || !!group.singleParticipantId;
	if (group.unitId && ownUnit) return { kind: 'unit' as const, unitId: group.unitId };
	if (group.delegationId) return { kind: 'delegation' as const, delegationId: group.delegationId };
	return undefined;
}

/** A whole delegation of more than one can be split; a part is split again from its delegation. */
export const canSplit = (group: AssignmentGroup) =>
	!!group.delegationId && group.whole && !group.part && group.size > 1;

/** A target as mutation arguments, which take no `null`. */
export const roleArgs = (target: Target | null) => ({
	nationAlpha3Code: target?.nationAlpha3Code ?? undefined,
	nonStateActorId: target?.nonStateActorId ?? undefined
});

function describeNation(code: string, roles: BoardRoles, nationName: (code: string) => string) {
	const committees = roles.committees.filter((committee) =>
		committee.nations.some((nation) => nation.alpha3Code === code)
	);
	const nation = committees.flatMap((c) => c.nations).find((n) => n.alpha3Code === code);
	return {
		title: nationName(code),
		subtitle: committees.map((committee) => committee.abbreviation).join(', '),
		alpha2Code: nation?.alpha2Code,
		icon: undefined
	};
}

function describeNonStateActor(id: Nullable<string>, roles: BoardRoles) {
	const nsa = roles.nonStateActors.find((actor) => actor.id === id);
	return {
		title: nsa?.abbreviation ?? '',
		subtitle: nsa?.name ?? '',
		alpha2Code: undefined,
		icon: nsa?.fontAwesomeIcon ?? undefined
	};
}

/** How a role is shown: its name, where its seats are, and the flag or icon it goes by. */
export function describeRole(
	target: Target,
	roles: BoardRoles,
	nationName: (code: string) => string
) {
	return target.nationAlpha3Code
		? describeNation(target.nationAlpha3Code, roles, nationName)
		: describeNonStateActor(target.nonStateActorId, roles);
}

interface Wish {
	rank: number;
	nation?: Nullable<{ alpha3Code: string }>;
	nonStateActor?: Nullable<{ id: string }>;
}

const wishTarget = (wish: Wish): Target => ({
	nationAlpha3Code: wish.nation?.alpha3Code ?? null,
	nonStateActorId: wish.nonStateActor?.id ?? null
});

/**
 * How a planned role relates to the wishes: undefined without a role or without wishes to compare
 * with (a converted single participant), else the rank it was given (undefined: not wished).
 */
export function wishStatus(wishes: readonly Wish[] | undefined, target: Target) {
	if (!targetKey(target) || !wishes) return undefined;
	return { rank: wishRank(wishes, target) };
}

/** The border of a card on the board: excluded, flagged, planned to change, or plain. */
export function cardBorder(review: BoardReviewRow | undefined, pending: boolean) {
	if (review?.disqualified) return 'border-error';
	if (review?.flagged) return 'border-warning';
	return pending ? 'border-primary border-dashed' : 'border-base-300';
}

/** The rank a delegation gave a role among its wishes, if it wished for it at all. */
export function wishRank(wishes: readonly Wish[] | undefined, target: Target) {
	const key = targetKey(target);
	if (!key || !wishes) return undefined;
	return wishes.find((wish) => targetKey(wishTarget(wish)) === key)?.rank;
}

interface ListedWish extends Wish {
	nonStateActor?: Nullable<{ id: string; abbreviation: string }>;
}

/** Whether a wish is the role a group holds; never, while it holds none. */
function wishMatches(wish: ListedWish, target: Target) {
	if (!targetKey(target)) return false;
	return wish.nation
		? wish.nation.alpha3Code === target.nationAlpha3Code
		: wish.nonStateActor?.id === target.nonStateActorId;
}

/** Every wish of a delegation as a card lists it: the one matching its role first, then by rank. */
export function wishList(
	wishes: readonly ListedWish[] | undefined,
	target: Target,
	nationName: (code: string) => string
) {
	return (wishes ?? [])
		.map((wish) => ({
			key: wish.nation?.alpha3Code ?? wish.nonStateActor?.id ?? String(wish.rank),
			rank: wish.rank,
			name: wish.nation
				? nationName(wish.nation.alpha3Code)
				: (wish.nonStateActor?.abbreviation ?? ''),
			matches: wishMatches(wish, target)
		}))
		.toSorted((a, b) => Number(b.matches) - Number(a.matches) || a.rank - b.rank);
}

export const CONVERT_CONTAINER = 'convert';

export type SingleDropAction = { type: 'convert' } | { type: 'role'; roleId: string | undefined };

/**
 * What dropping a single participant into `container` does: turn them into a delegation, give
 * them the custom role of a role zone, or (the pool) take theirs away.
 */
export function singleDropAction(
	source: string,
	container: string | null
): SingleDropAction | undefined {
	if (!container || container === source) return undefined;
	if (container === CONVERT_CONTAINER) return { type: 'convert' };
	if (container === POOL_CONTAINER) return { type: 'role', roleId: undefined };
	return { type: 'role', roleId: container.replace(roleContainer(''), '') };
}

/** Roles more than one group goes to while the draft changes one of them: applying merges them. */
export function mergedRoles(groups: readonly AssignmentGroup[]) {
	const byRole = Map.groupBy(groups, (group) => targetKey(group.target) ?? '');
	return new Set(
		[...byRole]
			.filter(([key, members]) => key && members.length > 1 && members.some((g) => g.pending))
			.map(([key]) => key)
	);
}

/** Which notice the finish tab shows about the release. */
export function releaseNotice(released: boolean, justApplied: boolean) {
	if (released) return 'released' as const;
	return justApplied ? ('reminder' as const) : ('hidden' as const);
}
