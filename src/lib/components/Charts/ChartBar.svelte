<script lang="ts">
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

	const max = $derived(() => Math.max(...values));
	const length = (v: number) => {
		return Math.ceil((v / max()) * 100);
	};
</script>

<div class="w-full h-full min-h-28 flex items-end gap-1 px-4 pb-4 {wrapperClass}">
	{#each values as value, i}
		<div
			class="w-full bg-base-200 hover:bg-neutral-400 dark:hover:bg-neutral-600 rounded-md tooltip {elementClass} transition-color duration-300"
			style="height: {length(value)}%;"
			data-tip={formatter(value, (labels && labels[i]) || undefined)}
		>
			{#if showLabels && labels && length(value) > 40}
				<div class="text-base-content text-sm">{labels[i]}</div>
			{/if}
		</div>
	{/each}
</div>
