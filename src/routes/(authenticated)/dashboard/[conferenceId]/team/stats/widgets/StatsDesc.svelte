<script lang="ts">
	interface Props {
		currentValue?: number;
		historicValue?: number;
	}

	let { currentValue, historicValue }: Props = $props();

	type Trend = 'up' | 'down' | 'same';

	const trendOf = ({ current, historic }: { current: number; historic: number }): Trend =>
		current > historic ? 'up' : current < historic ? 'down' : 'same';

	const trendStyles: Record<Trend, { fontClass: string; icon: string }> = {
		up: { fontClass: 'text-[#00aa00]', icon: 'fa-arrow-up-right' },
		down: { fontClass: 'text-[#ff0000]', icon: 'fa-arrow-down-right' },
		same: { fontClass: '', icon: 'fa-equals' }
	};
</script>

<div class="stat-desc">
	{#if historicValue === undefined || currentValue === undefined}
		<span>–</span>
	{:else}
		{@const trend = trendStyles[trendOf({ current: currentValue, historic: historicValue })]}
		<span class={trend.fontClass}>
			<i class="fa-sharp-duotone fa-solid {trend.icon}"></i>
			{historicValue}
			{#if currentValue > historicValue}
				(+ {currentValue - historicValue})
			{:else if currentValue < historicValue}
				(- {Math.abs(currentValue - historicValue)})
			{/if}
		</span>
	{/if}
</div>
