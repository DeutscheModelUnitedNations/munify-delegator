<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { isOutsideSizeLimits, type SizeLimits } from '$lib/services/seatPlanning/hints';
	import type { UnMember } from '$lib/services/seatPlanning/unMembers';
	import RoleSizeBadge from './RoleSizeBadge.svelte';
	import SeatCell from './SeatCell.svelte';
	import type { SeatPlanner } from './seatPlanner.svelte';

	interface Props {
		planner: SeatPlanner;
		row: UnMember & { name: string };
		committees: { id: string; abbreviation: string }[];
		sizeLimits: SizeLimits;
		onShowInfo: (member: UnMember, anchor: HTMLElement) => void;
	}

	let { planner, row, committees, sizeLimits, onShowInfo }: Props = $props();

	const size = $derived(planner.seatCounts.get(row.alpha3Code) ?? 0);
</script>

<tr class="hover:bg-base-200 {isOutsideSizeLimits(size, sizeLimits) && 'bg-error/10'}">
	<th class="bg-base-100 font-normal">
		<button
			class="flex items-center gap-2 text-left hover:underline"
			onclick={(e) => onShowInfo(row, e.currentTarget)}
		>
			<Flag alpha2Code={row.alpha2Code} size="xs" />
			<span class="max-w-48 truncate">{row.name}</span>
		</button>
	</th>
	{#each committees as committee (committee.id)}
		<SeatCell {planner} {committee} nation={row} />
	{/each}
	<td class="text-center whitespace-nowrap">
		<RoleSizeBadge {size} {sizeLimits} members={planner.nationMemberCount(row.alpha3Code)} />
	</td>
</tr>
