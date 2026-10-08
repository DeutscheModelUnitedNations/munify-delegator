<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import { client, type CalendarentrycolorEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import ColorPaletteSelector from '$lib/components/calendar/ColorPaletteSelector.svelte';
	import { untrack } from 'svelte';
	import { combineDateTime, toTimeString } from './calendarTime';

	interface Props {
		conferenceId: string;
		/** The day a new entry goes on; an edited or duplicated entry stays on its own day. */
		dayId?: string;
		/** The entry to edit, or with `duplicate` the one to copy into a new entry. */
		entryId?: string;
		duplicate?: boolean;
		onClose: () => void;
	}

	let { conferenceId, dayId, entryId, duplicate = false, onClose }: Props = $props();

	// The modal is mounted once per entry it edits, and its fields are seeded once: re-reading
	// the row while someone types would discard their edits.
	const sourceEntryId = untrack(() => entryId);
	const isEdit = untrack(() => !!entryId && !duplicate);
	const source = sourceEntryId
		? await client.query.calendarEntry({
				__args: { id: sourceEntryId },
				id: true,
				calendarDayId: true,
				name: true,
				description: true,
				startTime: true,
				endTime: true,
				fontAwesomeIcon: true,
				color: true,
				placeId: true,
				room: true,
				calendarTrackId: true
			})
		: undefined;
	const targetDayId = source?.calendarDayId ?? untrack(() => dayId) ?? '';

	const day = $derived(
		await client.liveQuery.calendarDay({
			__args: { id: targetDayId },
			id: true,
			name: true,
			date: true,
			tracks: { id: true, name: true }
		})
	);

	const places = $derived(
		await client.liveQuery.places({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { name: 'asc' }
			},
			id: true,
			name: true
		})
	);

	let isLoading = $state(false);

	let entryName = $state(source?.name ?? '');
	let entryDescription = $state(source?.description ?? '');
	let entryStartTime = $state(source ? toTimeString(new Date(source.startTime)) : '09:00');
	let entryEndTime = $state(source ? toTimeString(new Date(source.endTime)) : '10:00');
	let entryIcon = $state(source?.fontAwesomeIcon ?? '');
	let entryColor = $state<CalendarentrycolorEnum>(source?.color ?? 'SESSION');
	let entryPlaceId = $state<string | null>(source?.placeId ?? null);
	let entryRoom = $state(source?.room ?? '');
	let entryTrackId = $state<string | null>(source?.calendarTrackId ?? null);

	// Track whether end time was manually edited (to avoid overwriting user input)
	let entryEndTimeManuallySet = $state(!!source);

	let entryTimeInvalid = $derived(
		Boolean(entryStartTime && entryEndTime && entryEndTime <= entryStartTime)
	);

	// Auto-set end time to 1h after start time when start time changes
	$effect(() => {
		if (entryStartTime && !entryEndTimeManuallySet) {
			const [h, min] = entryStartTime.split(':').map(Number);
			const endH = (h + 1) % 24;
			entryEndTime = `${endH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
		}
	});

	async function saveEntry() {
		if (!entryName || !entryStartTime || !entryEndTime) return;
		isLoading = true;
		const dayDate = new Date(day.date);
		const fields = {
			name: entryName,
			description: entryDescription || null,
			startTime: combineDateTime(dayDate, entryStartTime),
			endTime: combineDateTime(dayDate, entryEndTime),
			fontAwesomeIcon: entryIcon || null,
			color: entryColor,
			placeId: entryPlaceId || null,
			room: entryRoom || null,
			calendarTrackId: entryTrackId || null
		};
		try {
			if (isEdit && sourceEntryId) {
				await client.mutate.updateCalendarEntry({
					__args: { id: sourceEntryId, ...fields },
					id: true
				});
			} else {
				await client.mutate.createCalendarEntry({
					__args: { calendarDayId: targetDayId, ...fields },
					id: true
				});
			}
			onClose();
		} catch (error) {
			console.error(isEdit ? 'Failed to update entry:' : 'Failed to create entry:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<ActionModal
	title={isEdit ? m.calendarEditEntry() : m.calendarAddEntry()}
	boxClass="max-w-2xl"
	confirmLabel={isEdit ? m.save() : m.create()}
	confirmDisabled={!entryName || !entryStartTime || !entryEndTime || entryTimeInvalid}
	loading={isLoading}
	onConfirm={saveEntry}
	{onClose}
>
	{#snippet subtitle()}
		{day.name} – {new Date(day.date).toLocaleDateString()}
	{/snippet}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.name()}</legend>
		<input type="text" bind:value={entryName} class="input w-full" required />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.description()}</legend>
		<textarea bind:value={entryDescription} class="textarea w-full"></textarea>
	</fieldset>
	<div class="grid grid-cols-2 gap-4">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarStartTime()}</legend>
			<input type="time" bind:value={entryStartTime} class="input w-full" required />
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarEndTime()}</legend>
			<input
				type="time"
				bind:value={entryEndTime}
				oninput={() => (entryEndTimeManuallySet = true)}
				class="input w-full {entryTimeInvalid ? 'input-error' : ''}"
				required
			/>
		</fieldset>
	</div>
	{#if entryTimeInvalid}
		<p class="text-error -mt-2 text-xs">
			<i class="fas fa-triangle-exclamation"></i>
			{m.calendarEntryEndBeforeStart()}
		</p>
	{/if}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarTrack()}</legend>
		<select class="select w-full" bind:value={entryTrackId}>
			<option value={null}>{m.calendarAllTracks()}</option>
			{#each day.tracks as track (track.id)}
				<option value={track.id}>{track.name}</option>
			{/each}
		</select>
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarColor()}</legend>
		<ColorPaletteSelector value={entryColor} onchange={(c) => (entryColor = c)} />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarIcon()}</legend>
		<div class="flex items-center gap-2">
			<input type="text" bind:value={entryIcon} class="input flex-1" placeholder="e.g. gavel" />
			{#if entryIcon}
				<i class="fa-sharp-duotone fa-solid fa-{entryIcon} text-base-content/60 text-lg"></i>
			{/if}
		</div>
	</fieldset>
	<div class="grid grid-cols-2 gap-4">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarPlace()}</legend>
			<select class="select w-full" bind:value={entryPlaceId}>
				<option value={null}>{m.calendarNoPlace()}</option>
				{#each places as place (place.id)}
					<option value={place.id}>{place.name}</option>
				{/each}
			</select>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarRoom()}</legend>
			<input type="text" bind:value={entryRoom} class="input w-full" />
		</fieldset>
	</div>
</ActionModal>
