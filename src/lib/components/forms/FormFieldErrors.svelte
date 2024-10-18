<script lang="ts">
	import { slide } from 'svelte/transition';
	let { errors }: { errors: string[] } = $props();
</script>

<span class="mt-1">
	{#each errors as error}
		<span transition:slide class="text-error">{error}</span>
	{/each}
</span>
