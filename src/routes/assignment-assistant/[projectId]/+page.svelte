<script lang="ts">
	import Tab from '$lib/components/Tabs/Tab.svelte';
	import Tabs from '$lib/components/Tabs/Tabs.svelte';
	import { onMount } from 'svelte';
	import Sighting from './Sighting.svelte';
	import type { PageData } from './$types';
	import { loadProjects } from './appData.svelte';
	import Weighting from './Weighting.svelte';
	import Assignment from './Assignment.svelte';
	import Summary from './Assignment.svelte';
	import Singles from './Singles.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let tab = $state(2);

	onMount(() => {
		console.log(data);
		loadProjects(data.projectId);
	});
</script>

<main class="hidden w-full flex-col p-10 lg:flex">
	<Tabs>
		<Tab active={tab === 0} title="Sichtung" icon="eye" onclick={() => (tab = 0)} />
		<Tab active={tab === 1} title="Gewichtung" icon="balance-scale" onclick={() => (tab = 1)} />
		<Tab active={tab === 2} title="Singles" icon="user-tie" onclick={() => (tab = 2)} />
		<Tab active={tab === 3} title="Zuweisung" icon="split" onclick={() => (tab = 3)} />
		<Tab
			active={tab === 4}
			title="Zusammenfassung"
			icon="clipboard-list"
			onclick={() => (tab = 4)}
		/>
	</Tabs>

	{#if tab === 0}
		<Sighting />
	{/if}

	{#if tab === 1}
		<Weighting />
	{/if}

	{#if tab === 2}
		<Singles />
	{/if}

	{#if tab === 3}
		<Assignment />
	{/if}

	{#if tab === 4}
		<Summary />
	{/if}
</main>

<main class="h-full w-full flex-col items-center justify-center p-10 lg:hidden">
	<i class="fa-duotone fa-ban text-5xl"></i>
	<h1 class="text-2xl font-bold">Smaller Screensizes are not supported</h1>
	<p class="text-base">Please use a larger screen to view this page</p>
</main>
