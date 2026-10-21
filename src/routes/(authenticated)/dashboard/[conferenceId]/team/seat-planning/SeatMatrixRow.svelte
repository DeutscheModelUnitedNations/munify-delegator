<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { translateRegionalGroup } from '#lib/utils/enumTranslations.js';
	import { isOutsideSizeLimits, type SizeLimits } from '#lib/helpers/seatPlanning/hints.js';
	import type { UnMember } from '#lib/helpers/seatPlanning/unMembers.js';
	import RoleSizeBadge from './RoleSizeBadge.svelte';
	import SeatCell from './SeatCell.svelte';
	import type { SeatPlanner } from './seatPlanner.svelte';

	interface Props {
		planner: SeatPlanner;
		row: UnMember & { name: string };
		committees: { id: string; abbreviation: string }[];
		sizeLimits: SizeLimits;
		onShowInfo: (member: UnMember, anchor: HTMLElement) => void;
		onHideInfo: () => void;
	}

	let { planner, row, committees, sizeLimits, onShowInfo, onHideInfo }: Props = $props();

	const size = $derived(planner.seatCounts.get(row.alpha3Code) ?? 0);
	const outsideLimits = $derived(isOutsideSizeLimits(size, sizeLimits));
</script>

<tr class="hover:bg-base-300 {outsideLimits ? 'bg-error/10' : ''}">
	<th class="bg-inherit font-normal">
		<button
			class="flex cursor-help items-center gap-2 text-left"
			onmouseenter={(e) => onShowInfo(row, e.currentTarget)}
			onmouseleave={onHideInfo}
			onfocus={(e) => onShowInfo(row, e.currentTarget)}
			onblur={onHideInfo}
		>
			<Flag alpha2Code={row.alpha2Code} size="xs" />
			<span class="max-w-36 truncate">{row.name}</span>
		</button>
	</th>
	<td class="truncate" title={translateRegionalGroup(row.regionalGroup)}>
		{translateRegionalGroup(row.regionalGroup, true)}
	</td>
	{#each committees as committee (committee.id)}
		<SeatCell {planner} {committee} nation={row} />
	{/each}
	<td class="text-center whitespace-nowrap">
		<RoleSizeBadge {size} {sizeLimits} members={planner.nationMemberCount(row.alpha3Code)} />
	</td>
</tr>
