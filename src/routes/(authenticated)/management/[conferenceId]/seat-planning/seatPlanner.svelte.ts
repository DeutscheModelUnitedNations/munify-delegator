import { graphql } from '$houdini';
import { m } from '$lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
import {
	assignedMemberCounts,
	nationSeatCounts,
	rolesOf,
	seatsWithPending,
	type PendingSeat,
	type PlanningCommittee,
	type Role
} from '$lib/services/seatPlanning/hints';
import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';

const setCommitteeNationSeatMutation = graphql(`
	mutation SetCommitteeNationSeatMutation(
		$committeeId: ID!
		$nationAlpha3Code: String!
		$enabled: Boolean!
	) {
		setCommitteeNationSeat(
			committeeId: $committeeId
			nationAlpha3Code: $nationAlpha3Code
			enabled: $enabled
		) {
			id
			nations {
				alpha2Code
				alpha3Code
			}
		}
	}
`);

interface SeatPlannerCommittee {
	id: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	nations: { alpha3Code: string }[];
}

interface SeatPlannerNonStateActor {
	id: string;
	seatAmount: number;
}

interface SeatPlannerAssignments {
	committeeSeats: { committeeId: string; nationAlpha3Code: string; memberNames: string[] }[];
	roles: { nationAlpha3Code: string | null; nonStateActorId: string | null; memberCount: number }[];
}

interface SeatPlannerSource {
	committees: SeatPlannerCommittee[];
	nonStateActors: SeatPlannerNonStateActor[];
	assignments: SeatPlannerAssignments;
}

const seatKey = (committeeId: string, nationAlpha3Code: string) =>
	`${committeeId}:${nationAlpha3Code}`;

/**
 * Seat matrix state shared by the matrix, the NSA list and the hints sidebar. Clicks are applied
 * optimistically and rolled back if the server refuses them.
 */
export class SeatPlanner {
	/** optimistic seat states until the server confirmed them */
	#pending = new SvelteMap<string, PendingSeat>();
	/** latest request per seat; plain bookkeeping that nothing renders */
	#requests: Record<string, number | undefined> = {};
	/** nations per committee, including the optimistic changes */
	#seats: Map<string, Set<string>>;
	#locks: Record<string, string[] | undefined>;
	#abbreviations: Record<string, string | undefined>;
	#memberCounts: { nations: Map<string, number>; nonStateActors: Map<string, number> };

	committees: PlanningCommittee[];
	seatCounts: Map<string, number>;
	roles: Role[];

	constructor(source: () => SeatPlannerSource) {
		this.#seats = $derived(seatsWithPending(source().committees, [...this.#pending.values()]));

		this.committees = $derived(
			source().committees.map((committee) => ({
				id: committee.id,
				numOfSeatsPerDelegation: committee.numOfSeatsPerDelegation,
				nations: [...(this.#seats.get(committee.id) ?? [])]
			}))
		);
		this.seatCounts = $derived(nationSeatCounts(this.committees));
		this.roles = $derived(rolesOf(this.seatCounts, source().nonStateActors));

		this.#abbreviations = $derived(
			Object.fromEntries(source().committees.map((c) => [c.id, c.abbreviation]))
		);

		this.#locks = $derived(
			Object.fromEntries(
				source().assignments.committeeSeats.map((seat) => [
					seatKey(seat.committeeId, seat.nationAlpha3Code),
					seat.memberNames
				])
			)
		);

		this.#memberCounts = $derived(assignedMemberCounts(source().assignments.roles));
	}

	hasSeat(committeeId: string, nationAlpha3Code: string) {
		return !!this.#seats.get(committeeId)?.has(nationAlpha3Code);
	}

	/** names of the delegates that make removing this seat impossible */
	lockedBy(committeeId: string, nationAlpha3Code: string) {
		return this.#locks[seatKey(committeeId, nationAlpha3Code)];
	}

	/** members of the delegation assigned to the nation, if any */
	nationMemberCount(nationAlpha3Code: string) {
		return this.#memberCounts.nations.get(nationAlpha3Code);
	}

	/** members of the delegation assigned to the NSA, if any */
	nonStateActorMemberCount(nonStateActorId: string) {
		return this.#memberCounts.nonStateActors.get(nonStateActorId);
	}

	async setSeat(committeeId: string, nationAlpha3Code: string, enabled: boolean, undoable = true) {
		const key = seatKey(committeeId, nationAlpha3Code);
		const request = this.#begin(key, committeeId, nationAlpha3Code, enabled);
		try {
			await setCommitteeNationSeatMutation.mutate({ committeeId, nationAlpha3Code, enabled });
		} catch {
			// the houdini client already shows the server's error as a toast
			return;
		} finally {
			this.#end(key, request);
		}

		if (undoable) this.#offerUndo(committeeId, nationAlpha3Code, enabled);
	}

	/** shows the clicked state until the server answered; returns the id of this request */
	#begin(key: string, committeeId: string, nationAlpha3Code: string, enabled: boolean) {
		const request = (this.#requests[key] ?? 0) + 1;
		this.#requests[key] = request;
		this.#pending.set(key, { committeeId, nationAlpha3Code, enabled });
		return request;
	}

	/** a quicker second click on the same cell keeps its optimistic state until it is answered */
	#end(key: string, request: number) {
		if (this.#requests[key] === request) this.#pending.delete(key);
	}

	#offerUndo(committeeId: string, nationAlpha3Code: string, enabled: boolean) {
		const values = {
			nation: getFullTranslatedCountryNameFromISO3Code(nationAlpha3Code),
			committee: this.#abbreviations[committeeId] ?? ''
		};
		const message = enabled ? m.seatPlanningSeatAdded(values) : m.seatPlanningSeatRemoved(values);
		toast.success(message, {
			action: {
				label: m.undo(),
				onClick: () => this.setSeat(committeeId, nationAlpha3Code, !enabled, false)
			}
		});
	}
}
