<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import NavMenu from '$lib/components/NavMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/NavMenu/NavMenuButton.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import type { PageData } from './$houdini';
	import Spinner from '$lib/components/Spinner.svelte';
	import { page } from '$app/stores';

	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();
	let myConferenceQuery = $derived(data.GetMyActiveConferencesQuery);
	let conferences = $derived($myConferenceQuery.data?.findManyConferences);

	let upcomingConferences = $derived(conferences?.filter((c) => c.startConference > new Date()));
	let activeConferences = $derived(
		conferences?.filter((c) => c.startConference <= new Date() && c.endConference >= new Date())
	);
	let pastConferences = $derived(conferences?.filter((c) => c.endConference < new Date()));

	let navbarExpanded = $state(true);
</script>

<svelte:head>
	<title>MUNify Delegator - {m.dashboard()}</title>
</svelte:head>

<SideNavigationDrawer bind:expanded={navbarExpanded}>
	<NavMenu>
		{#if !conferences}
			<Spinner />
		{:else}
			{#if conferences.length > 1}
				<NavMenuButton
					href="/dashboard"
					icon="fa-house"
					active={$page.url.pathname.endsWith('dashboard')}
					title={m.dashboard()}
					bind:expanded={navbarExpanded}
				/>
			{/if}
			{#if activeConferences && activeConferences.length > 0}
				<div class="h-6"></div>
				<p class="pb-2 text-xs">{m.activeConferences()}</p>
				{#each activeConferences as { id, title }}
					<NavMenuButton
						href="/dashboard/{id}"
						icon="fa-flag"
						{title}
						active={$page.url.pathname.includes(id)}
						bind:expanded={navbarExpanded}
					/>
				{/each}
			{/if}
			{#if upcomingConferences && upcomingConferences.length > 0}
				{#if navbarExpanded}
					<div class="h-6"></div>
					<p class="pb-2 text-xs text-gray-500">{m.upcomingConferences()}</p>
				{/if}
				{#each upcomingConferences as { id, title }}
					<NavMenuButton
						href="/dashboard/{id}"
						icon="fa-flag"
						{title}
						active={$page.url.pathname.includes(id)}
						bind:expanded={navbarExpanded}
					/>
				{/each}
			{/if}
			{#if pastConferences && pastConferences.length > 0}
				{#if navbarExpanded}
					<div class="h-6"></div>
					<p class="pb-2 text-xs text-gray-500">{m.pastConferences()}</p>
				{/if}
				{#each pastConferences as { id, title }}
					<NavMenuButton
						href="/dashboard/{id}"
						icon="fa-flag"
						{title}
						active={$page.url.pathname.includes(id)}
						bind:expanded={navbarExpanded}
					/>
				{/each}
			{/if}
		{/if}
	</NavMenu>
</SideNavigationDrawer>

<div class="flex w-full sm:pl-8">
	{@render children()}
</div>
