<script module lang="ts">
	import type { DashboardHref } from '$lib/data/dashboardLinks';

	interface LinkShape<C> {
		id: string;
		icon: string;
		external?: boolean;
		getHref: (context: C) => DashboardHref;
		getTitle: () => string;
		getDescription: () => string;
	}
</script>

<script lang="ts" generics="Context, Link extends LinkShape<Context>">
	import DashboardLinksGrid from './DashboardLinksGrid.svelte';
	import DashboardLinkCard from './DashboardLinkCard.svelte';

	interface Props {
		links: Link[];
		context: Context;
	}

	let { links, context }: Props = $props();
</script>

<DashboardLinksGrid>
	{#each links as link (link.id)}
		<DashboardLinkCard
			href={link.getHref(context)}
			icon={link.icon}
			title={link.getTitle()}
			description={link.getDescription()}
			external={link.external}
		/>
	{/each}
</DashboardLinksGrid>
