<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import CalendarEditor from './CalendarEditor.svelte';
	import DaysTracksTab from './DaysTracksTab.svelte';
	import PlacesTab from './PlacesTab.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Tab state; each tab fetches what it shows
	let activeTab = $state<'calendar' | 'days' | 'places'>('calendar');
</script>

<div class="flex flex-col gap-6 py-4 sm:px-4">
	<div role="tablist" class="tabs tabs-border">
		<button
			role="tab"
			class="tab {activeTab === 'calendar' ? 'tab-active' : ''}"
			aria-selected={activeTab === 'calendar'}
			onclick={() => (activeTab = 'calendar')}
		>
			{m.calendar()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'days' ? 'tab-active' : ''}"
			aria-selected={activeTab === 'days'}
			onclick={() => (activeTab = 'days')}
		>
			{m.calendarDaysAndTracks()}
		</button>
		<button
			role="tab"
			class="tab {activeTab === 'places' ? 'tab-active' : ''}"
			aria-selected={activeTab === 'places'}
			onclick={() => (activeTab = 'places')}
		>
			{m.calendarPlaces()}
		</button>
	</div>

	{#if activeTab === 'calendar'}
		<CalendarEditor conferenceId={params.conferenceId} onOpenDays={() => (activeTab = 'days')} />
	{:else if activeTab === 'days'}
		<DaysTracksTab conferenceId={params.conferenceId} />
	{:else}
		<PlacesTab conferenceId={params.conferenceId} />
	{/if}
</div>
