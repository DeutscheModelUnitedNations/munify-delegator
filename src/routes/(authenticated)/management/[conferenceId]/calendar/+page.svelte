<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import PreviewTab from './PreviewTab.svelte';
	import DaysTab from './DaysTab.svelte';
	import TracksTab from './TracksTab.svelte';
	import PlacesTab from './PlacesTab.svelte';
	import EntriesTab from './EntriesTab.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Tab state; each tab fetches what it shows
	let activeTab = $state<'preview' | 'days' | 'tracks' | 'places' | 'entries'>('preview');

	// The day picked on the tracks and entries tabs, shared so switching tabs keeps it
	let selectedDayId = $state<string | null>(null);
</script>

<div class="flex flex-col gap-6 p-4">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<h2 class="text-2xl font-bold">{m.calendar()}</h2>
	</div>

	<!-- Tabs -->
	<div role="tablist" class="tabs tabs-border">
		<button
			role="tab"
			class="tab {activeTab === 'preview' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'preview')}
		>
			{m.calendarPreview()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'days' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'days')}
		>
			{m.calendarDays()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'tracks' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'tracks')}
		>
			{m.calendarTracks()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'places' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'places')}
		>
			{m.calendarPlaces()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'entries' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'entries')}
		>
			{m.calendarEntries()}
		</button>
	</div>

	{#if activeTab === 'preview'}
		<PreviewTab conferenceId={params.conferenceId} />
	{:else if activeTab === 'days'}
		<DaysTab conferenceId={params.conferenceId} />
	{:else if activeTab === 'tracks'}
		<TracksTab conferenceId={params.conferenceId} bind:selectedDayId />
	{:else if activeTab === 'places'}
		<PlacesTab conferenceId={params.conferenceId} />
	{:else if activeTab === 'entries'}
		<EntriesTab conferenceId={params.conferenceId} bind:selectedDayId />
	{/if}
</div>
