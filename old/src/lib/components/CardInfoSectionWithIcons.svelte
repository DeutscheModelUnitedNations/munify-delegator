<script lang="ts">
	interface Info {
		fontAwesomeIcon: string;
		text?: string;
		link?: string;
	}

	let { items }: { items: Info[] } = $props();
</script>

<div class="grid grid-cols-[auto_1fr] gap-2">
	{#each items as { fontAwesomeIcon, text, link }}
		<i class={`fa-duotone fa-${fontAwesomeIcon.replace('fa-', '')}`}></i>
		{#if link}
			<a href={link} class="hover:underline" target="_blank">{text}</a>
		{:else}
			<p>{@html text}</p>
		{/if}
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
	}

	i {
		text-align: center;
		margin-top: 3px;
	}
</style>
