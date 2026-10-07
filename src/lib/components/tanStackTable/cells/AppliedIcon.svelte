<script lang="ts">
	import { getTableSettings } from '../toolbar/tableSettings.svelte';

	interface Props {
		applied: boolean;
	}

	let { applied }: Props = $props();
	const { getTableSize } = getTableSettings();
</script>

<div class="text-center">
	{#if applied}
		<i class="fa-solid fa-circle-check text-success text-{getTableSize()}"></i>
	{:else}
		<i class="fa-solid fa-hourglass-half text-warning text-{getTableSize()}"></i>
	{/if}
</div>
