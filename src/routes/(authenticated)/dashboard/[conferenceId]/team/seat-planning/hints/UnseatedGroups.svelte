<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateRegionalGroup } from '$lib/utils/enumTranslations';
	import { seatedByGroup } from '$lib/helpers/seatPlanning/hints';
	import { unMembers, type RegionalGroup } from '$lib/helpers/seatPlanning/unMembers';

	interface Props {
		seatCounts: Map<string, number>;
		onSelectGroup: (group: RegionalGroup) => void;
	}

	let { seatCounts, onSelectGroup }: Props = $props();

	const groups = $derived(seatedByGroup(unMembers, seatCounts));
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-1 p-3">
	<h4 class="text-sm font-semibold">{m.seatPlanningUnseated()}</h4>
	{#each groups as { group, unseated, total } (group)}
		<button
			class="btn btn-sm btn-ghost bg-base-100/40 h-auto min-h-8 justify-between gap-2 py-1 text-left font-normal"
			title={m.seatPlanningShowUnseated()}
			onclick={() => onSelectGroup(group)}
		>
			<span class="flex items-center gap-2">
				<i class="fa-sharp-duotone fa-solid fa-filter text-base-content/60 text-xs"></i>
				{translateRegionalGroup(group)}
			</span>
			<span class="badge badge-sm {unseated > 0 ? 'badge-neutral' : 'badge-ghost'}">
				{unseated}/{total}
			</span>
		</button>
	{/each}
</section>
