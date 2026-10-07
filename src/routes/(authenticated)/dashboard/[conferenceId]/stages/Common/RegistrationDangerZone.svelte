<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Leaving or deleting a registration, possible only until it has been completed, and the id to
	 * quote to support.
	 */
	interface Props {
		applied: boolean;
		/** Why nothing can be done here any more, once the registration is complete. */
		appliedText: string;
		/** Trusted HTML from the translation strings, introducing the id. */
		supportIdHtml: string;
		id: string;
		/** The destructive actions, while the registration is incomplete. */
		children: Snippet;
	}

	let { applied, appliedText, supportIdHtml, id, children }: Props = $props();
</script>

<section>
	<h2 class="mb-4 text-2xl font-bold">{m.dangerZone()}</h2>
	{#if applied}
		<div class="alert alert-info">
			<i class="fas fa-exclamation-triangle text-3xl"></i>
			<p>{appliedText}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{@render children()}
		</div>
	{/if}

	<p class="mt-10 text-xs">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html supportIdHtml}
		<span class="bg-base-200 rounded-sm p-1 font-mono">{id}</span>
	</p>
</section>
