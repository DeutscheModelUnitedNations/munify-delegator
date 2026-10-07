<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { sizeHistogram, type Role } from '$lib/helpers/seatPlanning/hints';

	interface Props {
		roles: Role[];
		onSelectSize: (size: number) => void;
	}

	let { roles, onSelectSize }: Props = $props();

	const histogram = $derived(sizeHistogram(roles));
	const maxCount = $derived(Math.max(1, ...histogram.map(({ count }) => count)));
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-2 p-3">
	<h4 class="text-sm font-semibold">{m.seatPlanningSizeHistogram()}</h4>
	{#each histogram as { size, count } (size)}
		<button
			class="hover:bg-base-300 flex items-center gap-2 rounded-field px-1 text-left text-sm"
			title={m.seatPlanningSizeOption({ size })}
			onclick={() => onSelectSize(size)}
		>
			<span class="w-5 text-right font-mono">{size}</span>
			<span class="bg-base-300 h-3 grow overflow-hidden rounded-selector">
				<span
					class="block h-full {count < 3 ? 'bg-warning' : 'bg-primary'}"
					style:width="{(count / maxCount) * 100}%"
				></span>
			</span>
			<span class="w-8 text-right font-mono">{count}</span>
		</button>
	{:else}
		<p class="text-base-content/60 text-sm">{m.seatPlanningNoHints()}</p>
	{/each}
</section>
