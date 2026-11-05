<script lang="ts">
	import { PAGE_SIZES } from '#lib/dataGrid/stateSchema';

	/** How many rows a page holds; a size a view saved outside the usual ones is offered too. */
	interface Props {
		pageSize: number;
		label: string;
		onpagesize: (size: number) => void;
	}

	let { pageSize, label, onpagesize }: Props = $props();

	const sizes = $derived(
		PAGE_SIZES.some((size) => size === pageSize)
			? [...PAGE_SIZES]
			: [...PAGE_SIZES, pageSize].sort((a, b) => a - b)
	);
</script>

<label class="flex items-center gap-2 text-sm">
	<span class="text-base-content/70 max-sm:sr-only">{label}</span>
	<select
		class="select select-bordered select-sm w-20"
		value={pageSize}
		onchange={(event) => onpagesize(Number(event.currentTarget.value))}
	>
		{#each sizes as size (size)}
			<option value={size}>{size}</option>
		{/each}
	</select>
</label>
