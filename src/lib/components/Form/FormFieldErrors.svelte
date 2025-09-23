<script lang="ts">
	import { slide } from 'svelte/transition';
	let { errors }: { errors: string[] } = $props();
</script>

<span class="pt-1 pl-2 {errors?.length > 0 ? '' : 'hidden'}">
	{#each errors as error}
		<span transition:slide class="text-error">{error}</span>
	{/each}
</span>
