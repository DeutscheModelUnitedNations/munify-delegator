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
			class="hover:bg-base-300 flex items-center justify-between gap-2 rounded px-1 text-left text-sm"
			title={m.seatPlanningShowUnseated()}
			onclick={() => onSelectGroup(group)}
		>
			<span>{translateRegionalGroup(group)}</span>
			<span class="badge badge-sm {unseated > 0 ? 'badge-neutral' : 'badge-ghost'}">
				{unseated}/{total}
			</span>
		</button>
	{/each}
</section>
