<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		values: number[];
		icons?: string[];
		labels?: string[];
		formatter?: (v: number, l: string | undefined) => string;
		wrapperClass?: string;
		elementClass?: string;
		percentage?: boolean;
		vertical?: boolean;
	}

	const defaultFormatter = (v: number, l: string | undefined) => {
		if (l) {
			return `${l}: ${v}`;
		}
		return `${v}`;
	};

	let {
		values,
		icons,
		labels,
		formatter = defaultFormatter,
		wrapperClass,
		elementClass,
		percentage = true,
		vertical = false
	}: Props = $props();

	const max = $derived(() => values.reduce((a, b) => a + b, 0));
	const length = (v: number) => {
		return Math.round((v / max()) * 100);
	};
</script>

<div
	class="w-full h-full min-h-28 flex {vertical ? 'flex-col' : 'flex-row'} gap-1 p-4 {wrapperClass}"
>
	{#if max() === 0}
		<div class="w-full h-full flex flex-col justify-center items-center text-sm">
			<i class="fas fa-chart-pie opacity-50 text-3xl"></i><span>
				{m.notEnoughData()}
			</span>
		</div>
	{:else}
		{#each values as value, i}
			<div
				class="{vertical
					? 'w-full'
					: 'h-full'} min-w-10 min-h-14 flex justify-center items-center bg-base-200 hover:bg-neutral-400 dark:hover:bg-neutral-600 tooltip {elementClass} transition-color duration-300 {vertical
					? 'first:rounded-t-md last:rounded-b-md'
					: 'first:rounded-l-md last:rounded-r-md'}"
				style={vertical ? `height: ${length(value)}%;` : `width: ${length(value)}%;`}
				data-tip={formatter(value, (labels && labels[i]) || undefined)}
			>
				<div class="flex flex-col justify-center items-center gap-1">
					{#if icons}
						<i class="fas fa-{icons[i].replace('fa-', '')} text-base-content"></i>
					{/if}
					{#if percentage}
						<div class="text-base-content text-sm">{length(value)}%</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>
