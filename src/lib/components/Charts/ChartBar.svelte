<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		values: number[];
		labels?: string[];
		formatter?: (v: number, l: string | undefined) => string;
		wrapperClass?: string;
		elementClass?: string;
		showLabels?: boolean;
	}

	const defaultFormatter = (v: number, l: string | undefined) => {
		if (l) {
			return `${l}: ${v}`;
		}
		return `${v}`;
	};

	let {
		values,
		labels,
		formatter = defaultFormatter,
		wrapperClass,
		elementClass,
		showLabels = true
	}: Props = $props();

	const max = $derived.by(() => Math.max(...values));
	const length = (v: number) => {
		return Math.ceil((v / max) * 100);
	};
</script>

<div class="flex h-full min-h-28 w-full items-end gap-1 px-4 pb-4 {wrapperClass}">
	{#if max === 0 || values.length === 0}
		<div class="flex h-full w-full flex-col items-center justify-center text-sm">
			<i class="fas fa-chart-simple text-3xl opacity-50"></i><span>
				{m.notEnoughData()}
			</span>
		</div>
	{:else}
		{#each values as value, i}
			<div
				class="tooltip bg-base-200 w-full rounded-md hover:bg-neutral-400 dark:hover:bg-neutral-600 {elementClass} transition-color duration-300"
				style="height: {length(value)}%;"
				data-tip={formatter(value, (labels && labels[i]) || undefined)}
			>
				{#if showLabels && labels && length(value) > 40}
					<div class="text-base-content text-sm">{labels[i]}</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
