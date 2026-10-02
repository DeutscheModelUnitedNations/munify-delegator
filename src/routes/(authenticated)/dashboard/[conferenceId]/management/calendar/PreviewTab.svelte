<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import CalendarDisplay from '$lib/components/calendar/CalendarDisplay.svelte';
	import { fetchConferenceCalendar } from './conferenceCalendar';
	import EntryFormModal from './EntryFormModal.svelte';
	import PlaceFormModal from './PlaceFormModal.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const calendar = $derived(await fetchConferenceCalendar(conferenceId));

	let editingEntryId = $state<string | null>(null);
	let editingPlaceId = $state<string | null>(null);

	let previewDays = $derived(
		calendar.calendarDays.map((day) => ({
			...day,
			date: new Date(day.date),
			tracks: [...day.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
			entries: [...day.entries]
				.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
				.map((e) => ({
					...e,
					startTime: new Date(e.startTime),
					endTime: new Date(e.endTime)
				}))
		}))
	);
</script>

{#if previewDays.length === 0}
	<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
		<i class="fas fa-calendar-days text-5xl opacity-50"></i>
		<p class="mt-4 text-lg opacity-70">{m.calendarNoDays()}</p>
	</div>
{:else}
	<CalendarDisplay
		days={previewDays}
		timezone={calendar.timezone}
		onEditEntry={(entryId) => (editingEntryId = entryId)}
		onEditPlace={(placeId) => (editingPlaceId = placeId)}
	/>
{/if}

{#if editingEntryId}
	{#key editingEntryId}
		<EntryFormModal
			{conferenceId}
			entryId={editingEntryId}
			onClose={() => (editingEntryId = null)}
		/>
	{/key}
{/if}

{#if editingPlaceId}
	{#key editingPlaceId}
		<PlaceFormModal
			{conferenceId}
			placeId={editingPlaceId}
			onClose={() => (editingPlaceId = null)}
		/>
	{/key}
{/if}
