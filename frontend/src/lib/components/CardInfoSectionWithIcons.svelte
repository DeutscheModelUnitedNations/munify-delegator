<script lang="ts">
	interface Info {
		icon: string;
		text: string;
		link?: string;
	}

	let { items }: { items: Info[] } = $props();
</script>

<div class="grid grid-cols-[auto_1fr] gap-2">
	{#each items as { icon, text, link }}
		<i class={`fa-duotone ${icon} mt-1`} />
		{#if link}
			<a href={link} class="hover:underline" target="_blank">{text}</a>
		{:else}
			<p>{text}</p>
		{/if}
	{/each}
</div>
