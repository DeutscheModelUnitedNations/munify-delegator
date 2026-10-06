<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { matchesSeatFilters, type SizeLimits } from '$lib/helpers/seatPlanning/hints';
	import { nextSortParams, sortSeatRows } from '$lib/helpers/seatPlanning/sortRows';
	import { unMembers } from '$lib/helpers/seatPlanning/unMembers';
	import CountryInfoPopover from './CountryInfoPopover.svelte';
	import { useSeatPlanningParams } from './filters';
	import SeatMatrixFilters from './SeatMatrixFilters.svelte';
	import SeatMatrixRow from './SeatMatrixRow.svelte';
	import SeatMatrixTotals from './SeatMatrixTotals.svelte';
	import type { SeatPlanner } from './seatPlanner.svelte';
	import SortableHeader from './SortableHeader.svelte';

	interface Props {
		planner: SeatPlanner;
		committees: { id: string; name: string; abbreviation: string }[];
		sizeLimits: SizeLimits;
	}

	let { planner, committees, sizeLimits }: Props = $props();

	const params = useSeatPlanningParams();
	let countryInfo = $state<CountryInfoPopover>();

	const seats = {
		size: (alpha3Code: string) => planner.seatCounts.get(alpha3Code) ?? 0,
		hasSeat: (committeeId: string, alpha3Code: string) => planner.hasSeat(committeeId, alpha3Code)
	};

	const rows = $derived(
		sortSeatRows(
			unMembers
				.map((member) => ({
					...member,
					name: getFullTranslatedCountryNameFromISO3Code(member.alpha3Code)
				}))
				.filter((row) => matchesSeatFilters(row, seats.size(row.alpha3Code), params)),
			{ key: params.sort ?? 'name', descending: params.desc ?? false },
			seats
		)
	);

	const sizes = $derived(
		[...new Set(planner.seatCounts.values())].filter((size) => size > 0).sort((a, b) => a - b)
	);
	const totalSeats = $derived(
		[...planner.seatCounts.values()].reduce((sum, size) => sum + size, 0)
	);
	const columns = $derived(committees.length + 3);

	/** a click on the active column flips its direction, any other column starts with its default */
	function sortBy(key: string) {
		const next = nextSortParams(params, key);
		params.desc = next.desc;
		params.sort = next.sort;
	}

	const header = (key: string) => ({
		active: (params.sort ?? 'name') === key,
		descending: params.desc ?? false,
		onSort: () => sortBy(key)
	});
</script>

<div class="flex h-full min-h-0 flex-col gap-3">
	<SeatMatrixFilters {sizes} />

	<!-- shrink to the table instead of spreading its columns over wide screens -->
	<div class="border-base-300 rounded-box min-h-0 w-fit max-w-full grow overflow-auto border">
		<!-- fixed layout: column widths must not move under the cursor while seats are toggled -->
		<table class="table-pin-rows table-pin-cols table-xs table w-max table-fixed">
			<thead>
				<tr>
					<SortableHeader label={m.seatPlanningState()} pinned class="w-52" {...header('name')}>
						{m.seatPlanningState()}
					</SortableHeader>
					<SortableHeader label={m.countryInfoRegionalGroup()} class="w-40" {...header('group')}>
						{m.countryInfoRegionalGroup()}
					</SortableHeader>
					{#each committees as committee (committee.id)}
						<SortableHeader
							label={committee.name}
							class="w-16 text-center"
							{...header(committee.id)}
						>
							{committee.abbreviation}
						</SortableHeader>
					{/each}
					<SortableHeader
						label={m.seatPlanningDelegationSize()}
						class="w-16 text-center"
						{...header('size')}
					>
						Σ
					</SortableHeader>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.alpha3Code)}
					<SeatMatrixRow
						{planner}
						{row}
						{committees}
						{sizeLimits}
						onShowInfo={(member, anchor) => countryInfo?.show(member, anchor)}
						onHideInfo={() => countryInfo?.hide()}
					/>
				{:else}
					<tr>
						<td colspan={columns} class="text-base-content/60 py-6 text-center">
							{m.seatPlanningNoResults()}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<SeatMatrixTotals committees={planner.committees} {totalSeats} />
			</tfoot>
		</table>
	</div>
</div>

<CountryInfoPopover bind:this={countryInfo} />
