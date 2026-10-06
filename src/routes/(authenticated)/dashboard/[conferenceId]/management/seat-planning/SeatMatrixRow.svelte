<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import { translateRegionalGroup } from '$lib/utils/enumTranslations';
	import { isOutsideSizeLimits, type SizeLimits } from '$lib/helpers/seatPlanning/hints';
	import type { UnMember } from '$lib/helpers/seatPlanning/unMembers';
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

<tr class="group hover:bg-base-200 {outsideLimits ? 'bg-error/10' : ''}">
	<!-- the pinned column needs an opaque background, so it follows the row's tint itself: the
	     gradient layers the translucent error tint over the opaque base colour -->
	<th
		class="bg-base-100 group-hover:bg-base-200 font-normal {outsideLimits
			? 'from-error/10 to-error/10 bg-linear-to-r'
			: ''}"
	>
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
