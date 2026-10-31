import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import {
	assignedMemberCounts,
	nationSeatCounts,
	rolesOf,
	seatsWithPending,
	type PendingSeat,
	type Role
} from './seatHints';
import type { BaselineCommittee, RegionalBaseline } from '#lib/helpers/seatPlanning/baselines';
import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';

interface SeatPlannerCommittee {
	id: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	regionalBaseline: RegionalBaseline;
	regionalBaselineTargets: number[];
	/** the nation roles the committee seats */
	roles: { nation?: { alpha3Code: string } | null }[];
}

interface SeatPlannerNonStateActor {
	id: string;
	seatAmount: number;
}

interface SeatPlannerAssignments {
	committeeSeats: { committeeId: string; nationAlpha3Code: string; memberNames: string[] }[];
	/** a nation's role carries its code, any other role only its id */
	roles: { roleId: string; nationAlpha3Code?: string | null; memberCount: number }[];
}

interface SeatPlannerSource {
	committees: SeatPlannerCommittee[];
	nonStateActors: SeatPlannerNonStateActor[];
	assignments: SeatPlannerAssignments;
}

const seatKey = ({
	committeeId,
	nationAlpha3Code
}: {
	committeeId: string;
	nationAlpha3Code: string;
}) => `${committeeId}:${nationAlpha3Code}`;

/**
 * Seat matrix state shared by the matrix, the NSA list and the hints sidebar. Clicks are applied
 * optimistically and rolled back if the server refuses them.
 */
export function createSeatPlanner(source: () => SeatPlannerSource) {
	/** optimistic seat states until the server confirmed them */
	const pending = new SvelteMap<string, PendingSeat>();
	/** latest request per seat; plain bookkeeping that nothing renders */
	const requests: Record<string, number | undefined> = {};

	/** nations per committee, including the optimistic changes */
	const seats: Map<string, Set<string>> = $derived(
		seatsWithPending({
			committees: source().committees.map((committee) => ({
				id: committee.id,
				nations: committee.roles.flatMap((role) => (role.nation ? [role.nation] : []))
			})),
			pending: [...pending.values()]
		})
	);

	const committees: BaselineCommittee[] = $derived(
		source().committees.map((committee) => ({
			id: committee.id,
			numOfSeatsPerDelegation: committee.numOfSeatsPerDelegation,
			regionalBaseline: committee.regionalBaseline,
			regionalBaselineTargets: committee.regionalBaselineTargets,
			nations: [...(seats.get(committee.id) ?? [])]
		}))
	);
	const seatCounts: Map<string, number> = $derived(nationSeatCounts(committees));
	const roles: Role[] = $derived(rolesOf({ seatCounts, nonStateActors: source().nonStateActors }));

	const abbreviations: Record<string, string | undefined> = $derived(
		Object.fromEntries(source().committees.map((c) => [c.id, c.abbreviation]))
	);

	const locks: Record<string, string[] | undefined> = $derived(
		Object.fromEntries(
			source().assignments.committeeSeats.map((seat) => [
				seatKey({ committeeId: seat.committeeId, nationAlpha3Code: seat.nationAlpha3Code }),
				seat.memberNames
			])
		)
	);

	const memberCounts: { nations: Map<string, number>; nonStateActors: Map<string, number> } =
		$derived(
			assignedMemberCounts(
				source().assignments.roles.map(({ roleId, nationAlpha3Code, memberCount }) => ({
					nationAlpha3Code: nationAlpha3Code ?? null,
					nonStateActorId: nationAlpha3Code ? null : roleId,
					memberCount
				}))
			)
		);

	/** shows the clicked state until the server answered; returns the id of this request */
	function begin({
		key,
		committeeId,
		nationAlpha3Code,
		enabled
	}: {
		key: string;
		committeeId: string;
		nationAlpha3Code: string;
		enabled: boolean;
	}) {
		const request = (requests[key] ?? 0) + 1;
		requests[key] = request;
		pending.set(key, { committeeId, nationAlpha3Code, enabled });
		return request;
	}

	/** a quicker second click on the same cell keeps its optimistic state until it is answered */
	function end({ key, request }: { key: string; request: number }) {
		if (requests[key] === request) pending.delete(key);
	}

	function offerUndo({
		committeeId,
		nationAlpha3Code,
		enabled
	}: {
		committeeId: string;
		nationAlpha3Code: string;
		enabled: boolean;
	}) {
		const values = {
			nation: getFullTranslatedCountryNameFromISO3Code(nationAlpha3Code),
			committee: abbreviations[committeeId] ?? ''
		};
		const message = enabled ? m.seatPlanningSeatAdded(values) : m.seatPlanningSeatRemoved(values);
		toast.success(message, {
			action: {
				label: m.undo(),
				onClick: () =>
					setSeat({ committeeId, nationAlpha3Code, enabled: !enabled, undoable: false })
			}
		});
	}

	async function setSeat({
		committeeId,
		nationAlpha3Code,
		enabled,
		undoable = true
	}: {
		committeeId: string;
		nationAlpha3Code: string;
		enabled: boolean;
		undoable?: boolean;
	}) {
		const key = seatKey({ committeeId, nationAlpha3Code });
		const request = begin({ key, committeeId, nationAlpha3Code, enabled });
		try {
			await client.mutate.setCommitteeNationSeat({
				__args: { committeeId, nationAlpha3Code, enabled },
				roles: { id: true }
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
			return;
		} finally {
			end({ key, request });
		}

		if (undoable) offerUndo({ committeeId, nationAlpha3Code, enabled });
	}

	return {
		get committees() {
			return committees;
		},
		get seatCounts() {
			return seatCounts;
		},
		get roles() {
			return roles;
		},

		hasSeat({ committeeId, nationAlpha3Code }: { committeeId: string; nationAlpha3Code: string }) {
			return !!seats.get(committeeId)?.has(nationAlpha3Code);
		},

		/** names of the delegates that make removing this seat impossible */
		lockedBy({ committeeId, nationAlpha3Code }: { committeeId: string; nationAlpha3Code: string }) {
			return locks[seatKey({ committeeId, nationAlpha3Code })];
		},

		/** members of the delegation assigned to the nation, if any */
		nationMemberCount(nationAlpha3Code: string) {
			return memberCounts.nations.get(nationAlpha3Code);
		},

		/** members of the delegation assigned to the NSA, if any */
		nonStateActorMemberCount(nonStateActorId: string) {
			return memberCounts.nonStateActors.get(nonStateActorId);
		},

		setSeat
	};
}

export type SeatPlanner = ReturnType<typeof createSeatPlanner>;
