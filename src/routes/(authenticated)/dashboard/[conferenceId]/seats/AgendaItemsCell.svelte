<script lang="ts">
	interface Props {
		items: { id: string; title: string; teaserText: string | null }[];
		onOpen: (id: string) => void;
	}

	let { items, onOpen }: Props = $props();
</script>

<ul class="flex flex-col gap-1 text-left">
	{#each items as item (item.id)}
		<li>
			{#if item.teaserText}
				<button class="link link-hover text-left" onclick={() => onOpen(item.id)}>
					{item.title}
				</button>
			{:else}
				{item.title}
			{/if}
		</li>
	{/each}
</ul>
