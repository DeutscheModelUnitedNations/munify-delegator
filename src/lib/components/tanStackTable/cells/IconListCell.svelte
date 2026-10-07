<script lang="ts">
	import { getTableSettings } from '../toolbar/tableSettings.svelte';

	interface Props {
		items: { icon: string; tooltip: string }[];
	}

	let { items }: Props = $props();
	const { getTableSize } = getTableSettings();
</script>

<div class="flex items-center justify-center gap-2">
	{#each items as item (item.tooltip)}
		<div class="tooltip" data-tip={item.tooltip}>
			<i class="{item.icon} text-{getTableSize()}"></i>
		</div>
	{/each}
</div>
