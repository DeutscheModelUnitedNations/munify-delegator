<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';

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

<DashboardSection icon="triangle-exclamation" title={m.dangerZone()}>
	{#if applied}
		<div class="bg-base-200 rounded-box flex items-start gap-3 p-4">
			<i class="fa-sharp-duotone fa-solid fa-lock text-base-content/60 mt-0.5 text-lg"></i>
			<p class="text-sm">{appliedText}</p>
		</div>
	{:else}
		<div class="flex flex-wrap gap-2">
			{@render children()}
		</div>
	{/if}

	<p class="text-base-content/60 mt-4 text-xs">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html supportIdHtml}
		<span class="bg-base-200 rounded-selector p-1 font-mono">{id}</span>
	</p>
</DashboardSection>
