<script lang="ts">
	import { slide } from 'svelte/transition';
	let { errors }: { errors: string[] } = $props();
</script>

<span class="validator-hint">
	{#each errors as error}
		<span class="text-error">{error}</span>
	{/each}
</span>
