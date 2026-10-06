<script lang="ts">
	import { translateRegionalGroup } from '$lib/services/enumTranslations';
	import type { GroupDeviation } from '$lib/services/seatPlanning/baselines';

	interface Props {
		groups: GroupDeviation[];
	}

	let { groups }: Props = $props();

	/** pixels per seat of deviation; one side of the axis is 72px wide */
	const SCALE = 9;
	const HALF = 72;

	const width = (deviation: number) => Math.min(HALF, Math.round(Math.abs(deviation) * SCALE));
	const format = (deviation: number) => {
		const sign = deviation > 0.05 ? '+' : deviation < -0.05 ? '−' : '±';
		return (
			sign +
			Math.abs(deviation).toLocaleString(undefined, {
				maximumFractionDigits: 1,
				minimumFractionDigits: 1
			})
		);
	};
	/** the bars carry the colour; the numbers stay readable in both themes */
	const tone = (deviation: number) => (Math.abs(deviation) < 1 ? 'text-base-content/60' : '');
</script>

<!-- diverging bars: too few seats grow to the left of the axis, too many to the right -->
<div
	class="grid items-center gap-y-1 text-xs"
	style:grid-template-columns="minmax(0, 1fr) {HALF}px 2px {HALF}px 2.5rem"
>
	{#each groups as { group, actual, target, deviation } (group)}
		<span
			class="truncate"
			title="{translateRegionalGroup(group)}: {actual} / {target.toLocaleString(undefined, {
				maximumFractionDigits: 1
			})}">{translateRegionalGroup(group, true)}</span
		>
		<span class="flex h-2.5 justify-end">
			{#if deviation < 0}
				<span class="bg-warning h-full rounded-sm" style:width="{width(deviation)}px"></span>
			{/if}
		</span>
		<span class="bg-base-content/30 h-4"></span>
		<span class="flex h-2.5 justify-start">
			{#if deviation > 0}
				<span class="bg-primary h-full rounded-sm" style:width="{width(deviation)}px"></span>
			{/if}
		</span>
		<span class="text-right font-semibold tabular-nums {tone(deviation)}">{format(deviation)}</span>
	{/each}
</div>
