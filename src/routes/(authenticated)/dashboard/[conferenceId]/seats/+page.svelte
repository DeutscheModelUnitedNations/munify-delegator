<script lang="ts">
	import { dev } from '$app/env';
	import { m } from '#lib/paraglide/messages.js';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import AccentStripe from '#lib/components/AccentStripe.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { fetchConferenceSeats, nonStateActorsOf, seatedNations } from './conferenceSeats';
	import CommitteePool from './CommitteePool.svelte';
	import NationSeatsTable from './NationSeatsTable.svelte';
	import NsaSeatsTable from './NsaSeatsTable.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId);
	const conference = $derived(await fetchConferenceSeats(conferenceId));
	const nations = $derived(seatedNations(conference));
	const nonStateActors = $derived(nonStateActorsOf(conference));

	const params = queryParameters({ tab: true });
	const tab = $derived(
		params.tab === 'nations' || params.tab === 'nsas' ? params.tab : 'committees'
	);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}{conference.title} – {m.conferenceSeats()}</title>
</svelte:head>

<div class="flex w-full flex-col gap-6 p-4">
	<header class="flex flex-col gap-2">
		<AccentStripe />
		<h1 class="text-3xl font-bold tracking-tight">{m.conferenceSeats()}</h1>
		<p class="text-base-content/70">{conference.title}</p>
	</header>

	<Tabs>
		<Tab
			title="{m.committeesAndAgendaItems()} ({conference.committees.length})"
			icon="podium"
			active={tab === 'committees'}
			onclick={() => (params.tab = null)}
		/>
		<Tab
			title="{m.nationsPool()} ({nations.length})"
			icon="flag"
			active={tab === 'nations'}
			onclick={() => (params.tab = 'nations')}
		/>
		<Tab
			title="{m.nsaPool()} ({nonStateActors.length})"
			icon="megaphone"
			active={tab === 'nsas'}
			onclick={() => (params.tab = 'nsas')}
		/>
	</Tabs>

	{#if tab === 'nations'}
		<NationSeatsTable committees={conference.committees} {nations} />
	{:else if tab === 'nsas'}
		<NsaSeatsTable {nonStateActors} />
	{:else}
		<CommitteePool committees={conference.committees} />
	{/if}
</div>
