<script module lang="ts">
	import type { Component } from 'svelte';
	import type { DashboardHref } from '$lib/data/dashboardLinks';

	interface LinkShape<C> {
		id: string;
		icon: string;
		external?: boolean;
		getHref: (context: C) => DashboardHref;
		getTitle: () => string;
		getDescription: () => string;
		info?: Component<{ conferenceId: string }>;
	}
</script>

<script lang="ts" generics="Context, Link extends LinkShape<Context>">
	import DashboardLinksGrid from './DashboardLinksGrid.svelte';
	import DashboardLinkCard from './DashboardLinkCard.svelte';
	import { onMount } from 'svelte';

	interface Props {
		links: Link[];
		context: Context;
		/** The conference the cards' live details are for */
		conferenceId: string;
	}

	let { links, context, conferenceId }: Props = $props();

	// The live details load their own data, and several of them next to each other do not hydrate
	// (svelte 5.57: `hydration_mismatch`, then a DOMException that leaves one card wearing
	// another's content). So they mount in the browser only, after the cards themselves hydrated.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<DashboardLinksGrid>
	{#each links as link (link.id)}
		<DashboardLinkCard
			href={link.getHref(context)}
			icon={link.icon}
			title={link.getTitle()}
			description={link.getDescription()}
			external={link.external}
		>
			{#snippet info()}
				{@const Info = link.info}
				{#if Info && mounted}<Info {conferenceId} />{/if}
			{/snippet}
		</DashboardLinkCard>
	{/each}
</DashboardLinksGrid>
