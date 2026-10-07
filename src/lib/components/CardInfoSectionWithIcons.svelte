<script lang="ts">
	interface Info {
		fontAwesomeIcon: string;
		/** Rendered as text: it may come from the database (a conference's location, a role's description). */
		text?: string;
		link?: string;
		/**
		 * Markup the app builds itself from values it formats, never from stored data. Takes the place
		 * of `text`.
		 */
		trustedHtml?: string;
	}

	let { items }: { items: Info[] } = $props();
</script>

<div class="grid grid-cols-[auto_1fr] gap-2">
	{#each items as { fontAwesomeIcon, text, link, trustedHtml }, i (i)}
		<i class={`fa-duotone fa-${fontAwesomeIcon.replace('fa-', '')}`}></i>
		{#if link}
			<a href={link} class="hover:underline" target="_blank" rel="external">{text}</a>
		{:else if trustedHtml}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: built by the caller from values it formats itself, see `trustedHtml` -->
			<p>{@html trustedHtml}</p>
		{:else}
			<p>{text}</p>
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
