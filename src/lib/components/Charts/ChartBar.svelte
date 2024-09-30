<script lang="ts">
	interface Props {
		values: number[];
		labels?: string[];
		formatter?: (v: number, l: string | undefined) => string;
		wrapperClass?: string;
		elementClass?: string;
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
		elementClass
	}: Props = $props();

	const max = $derived(() => Math.max(...values));
	const length = (v: number) => {
		return Math.ceil((v / max()) * 100);
	};
</script>

<div class="w-full h-full min-h-28 flex items-end gap-1 px-4 pb-4 {wrapperClass}">
	{#each values as value, i}
		<div
			class="w-full bg-base-200 rounded-md tooltip {elementClass}"
			style="height: {length(value)}%;"
			data-tip={formatter(value, (labels && labels[i]) || undefined)}
		></div>
	{/each}
</div>
