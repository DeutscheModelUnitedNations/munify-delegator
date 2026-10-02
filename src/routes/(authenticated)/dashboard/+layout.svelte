<script lang="ts">
	import { fetchMyConferences } from './myConferences.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { page } from '$app/state';
	import { dev } from '$app/environment';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
	const conferences = $derived(await fetchMyConferences());

	let upcomingConferences = $derived(conferences?.filter((c) => c.startConference > new Date()));
	let activeConferences = $derived(
		conferences?.filter((c) => c.startConference <= new Date() && c.endConference >= new Date())
	);
	let pastConferences = $derived(conferences?.filter((c) => c.endConference < new Date()));

	let navbarExpanded = $state(true);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.dashboard()}</title>
</svelte:head>

<!-- One group of conferences; the upcoming and past ones only label themselves while the
navigation is expanded -->
{#snippet conferenceGroup(
	label: string,
	group: { id: string; title: string }[] | undefined,
	muted: boolean
)}
	{#if group && group.length > 0}
		{#if !muted || navbarExpanded}
			<div class="h-6"></div>
			<p class="pb-2 text-xs {muted ? 'text-gray-500' : ''}">{label}</p>
		{/if}
		{#each group as { id, title } (id)}
			<NavMenuButton
				href="/dashboard/{id}"
				icon="fa-flag"
				{title}
				active={page.url.pathname.includes(id)}
				bind:expanded={navbarExpanded}
			/>
		{/each}
	{/if}
{/snippet}

<SideNavigationDrawer bind:expanded={navbarExpanded}>
	<NavMenu>
		{#if !conferences}
			<Spinner />
		{:else}
			{@render conferenceGroup(m.activeConferences(), activeConferences, false)}
			{@render conferenceGroup(m.upcomingConferences(), upcomingConferences, true)}
			{@render conferenceGroup(m.pastConferences(), pastConferences, true)}
		{/if}
	</NavMenu>
</SideNavigationDrawer>

<div class="flex w-full sm:pl-8">
	{@render children()}
</div>
