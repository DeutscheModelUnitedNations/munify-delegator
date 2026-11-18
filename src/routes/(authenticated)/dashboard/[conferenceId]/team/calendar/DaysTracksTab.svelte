<script lang="ts">
	import NoCalendarDays from './NoCalendarDays.svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import CopyDayEntriesModal from './CopyDayEntriesModal.svelte';
	import TrackMatrix from './TrackMatrix.svelte';
	import DayFormModal from './DayFormModal.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const [calendarDays, tracks] = $derived(
		await Promise.all([
			client.liveQuery.calendarDays({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { date: 'asc' }
				},
				id: true,
				name: true,
				date: true,
				tracks: { id: true },
				entries: { id: true }
			}),
			client.liveQuery.calendarTracks({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { sortOrder: 'asc' }
				},
				id: true,
				name: true,
				description: true,
				sortOrder: true,
				committees: { id: true },
				conferenceRoles: { id: true },
				entries: { id: true, calendarDayId: true }
			})
		])
	);

	type Day = (typeof calendarDays)[number];

	/** The open day form: empty adds a day, `day` edits that one */
	let dayForm = $state<{ day?: Day } | null>(null);
	let dayToDelete = $state<Day | null>(null);
	let dayToCopy = $state<Day | null>(null);

	async function deleteDay() {
		if (!dayToDelete) return;
		try {
			await client.mutate.deleteCalendarDay({ __args: { id: dayToDelete.id } });
			dayToDelete = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		}
	}
</script>

<div class="flex justify-end">
	<button class="btn btn-primary btn-sm" onclick={() => (dayForm = {})}>
		<i aria-hidden="true" class="ph-fill ph-plus"></i>
		{m.calendarAddDay()}
	</button>
</div>

{#if calendarDays.length === 0}
	<NoCalendarDays onAdd={() => (dayForm = {})} />
{/if}

{#if calendarDays.length > 0}
	<TrackMatrix
		{conferenceId}
		days={calendarDays}
		{tracks}
		onCopyEntries={(day) => (dayToCopy = day)}
		onEdit={(day) => (dayForm = { day })}
		onDelete={(day) => (dayToDelete = day)}
	/>
{/if}

{#if dayForm}
	{#key dayForm}
		<DayFormModal {conferenceId} day={dayForm.day} onClose={() => (dayForm = null)} />
	{/key}
{/if}

{#if dayToDelete}
	<ConfirmDeleteModal
		title={m.calendarDeleteDay()}
		text={m.calendarConfirmDeleteDay()}
		onConfirm={deleteDay}
		onClose={() => (dayToDelete = null)}
	/>
{/if}

{#if dayToCopy}
	<CopyDayEntriesModal
		{conferenceId}
		dayId={dayToCopy.id}
		dayName={dayToCopy.name}
		entryCount={dayToCopy.entries.length}
		onClose={() => (dayToCopy = null)}
	/>
{/if}
