<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateRegionalGroup } from '$lib/services/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { matchesSeatFilters, type SizeLimits } from '$lib/services/seatPlanning/hints';
	import { regionalGroups, unMembers } from '$lib/services/seatPlanning/unMembers';
	import CountryInfoPopover from './CountryInfoPopover.svelte';
	import { useSeatPlanningParams } from './filters';
	import SeatMatrixFilters from './SeatMatrixFilters.svelte';
	import SeatMatrixRow from './SeatMatrixRow.svelte';
	import SeatMatrixTotals from './SeatMatrixTotals.svelte';
	import type { SeatPlanner } from './seatPlanner.svelte';

	interface Props {
		planner: SeatPlanner;
		committees: { id: string; name: string; abbreviation: string }[];
		sizeLimits: SizeLimits;
	}

	let { planner, committees, sizeLimits }: Props = $props();

	const params = useSeatPlanningParams();
	let countryInfo = $state<CountryInfoPopover>();

	const sizeOf = (alpha3Code: string) => planner.seatCounts.get(alpha3Code) ?? 0;

	const rows = $derived(
		unMembers
			.map((member) => ({
				...member,
				name: getFullTranslatedCountryNameFromISO3Code(member.alpha3Code)
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	const groups = $derived(
		regionalGroups.map((group) => {
			const members = rows.filter((row) => row.regionalGroup === group);
			return {
				group,
				total: members.length,
				seated: members.filter((row) => sizeOf(row.alpha3Code) > 0).length,
				rows: members.filter((row) => matchesSeatFilters(row, sizeOf(row.alpha3Code), $params))
			};
		})
	);

	const sizes = $derived(
		[...new Set(planner.seatCounts.values())].filter((size) => size > 0).sort((a, b) => a - b)
	);
	const totalSeats = $derived(
		[...planner.seatCounts.values()].reduce((sum, size) => sum + size, 0)
	);
	const columns = $derived(committees.length + 2);
</script>

<div class="flex h-full min-h-0 flex-col gap-3">
	<SeatMatrixFilters {sizes} />

	<div class="border-base-300 rounded-box min-h-0 grow overflow-auto border">
		<!-- fixed layout: column widths must not move under the cursor while seats are toggled -->
		<table class="table-pin-rows table-pin-cols table-xs table table-fixed">
			<thead>
				<tr>
					<th class="bg-base-200 z-20 w-60">{m.seatPlanningState()}</th>
					{#each committees as committee (committee.id)}
						<td class="bg-base-200 w-20 text-center">
							<span class="tooltip tooltip-bottom" data-tip={committee.name}>
								{committee.abbreviation}
							</span>
						</td>
					{/each}
					<td class="bg-base-200 w-20 text-center" title={m.seatPlanningDelegationSize()}>Σ</td>
				</tr>
			</thead>
			<tbody>
				{#each groups.filter((g) => g.rows.length > 0) as { group, total, seated, rows: groupRows } (group)}
					<tr>
						<th colspan={columns} class="bg-base-300 text-sm font-semibold">
							{translateRegionalGroup(group)} ({seated}/{total})
						</th>
					</tr>
					{#each groupRows as row (row.alpha3Code)}
						<SeatMatrixRow
							{planner}
							{row}
							{committees}
							{sizeLimits}
							onShowInfo={(member, anchor) => countryInfo?.show(member, anchor)}
						/>
					{/each}
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
