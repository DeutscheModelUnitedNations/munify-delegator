<!-- fallow-ignore-file complexity -->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import { client, type CalendarentrycolorEnum } from '$lib/api/rumbleClient/client';
	import { saveWithToast } from '$lib/helpers/saveWithToast';
	import { m } from '$lib/paraglide/messages';
	import ColorPaletteSelector from '$lib/components/calendar/ColorPaletteSelector.svelte';
	import { untrack } from 'svelte';
	import { retargetTrackRange } from './copyDayEntries';
	import { entryFields } from './calendarEditing';
	import { formatMinutes, minutesOfDay, normalizeTrackIds } from './calendarGrid';

	interface Props {
		conferenceId: string;
		/** The entry to edit, or with `duplicate` the one to copy into a new entry. */
		entryId?: string;
		duplicate?: boolean;
		/** Where a new entry goes and when, as the editor's drag or the add button picked it. */
		initial?: { dayId: string; trackIds: string[]; start: number; end: number };
		onClose: () => void;
		/** Offered when editing: copies this entry into a new one */
		onDuplicate?: (entryId: string) => void;
		/** Offered when editing: asks for this entry to be deleted */
		onDelete?: (entryId: string) => void;
	}

	let {
		conferenceId,
		entryId,
		duplicate = false,
		initial,
		onClose,
		onDuplicate,
		onDelete
	}: Props = $props();

	/** A few icons for the usual kinds of programme items; any other FontAwesome name works too. */
	const ICON_PRESETS = [
		'gavel',
		'users',
		'microphone',
		'bullhorn',
		'flag',
		'handshake',
		'mug-hot',
		'utensils',
		'champagne-glasses',
		'music',
		'bus',
		'door-open',
		'clipboard-list',
		'graduation-cap',
		'camera',
		'bed'
	];
	const DURATIONS = [30, 45, 60, 90, 120];

	// The modal is mounted once per entry it edits, and its fields are seeded once: re-reading
	// the row while someone types would discard their edits.
	const sourceEntryId = untrack(() => entryId);
	const seed = untrack(() => initial);
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
				tracks: { id: true, sortOrder: true }
			})
		: undefined;

	let selectedDayId = $state(source?.calendarDayId ?? seed?.dayId ?? '');

	const days = $derived(
		await client.liveQuery.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true,
			date: true
		})
	);

	const day = $derived(
		await client.liveQuery.calendarDay({
			__args: { id: selectedDayId },
			id: true,
			name: true,
			date: true,
			tracks: { id: true, name: true, sortOrder: true }
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
	let entryStartTime = $state(
		source ? formatMinutes(minutesOfDay(source.startTime)) : formatMinutes(seed?.start ?? 9 * 60)
	);
	let entryEndTime = $state(
		source ? formatMinutes(minutesOfDay(source.endTime)) : formatMinutes(seed?.end ?? 10 * 60)
	);
	let entryIcon = $state(source?.fontAwesomeIcon ?? '');
	let entryColor = $state<CalendarentrycolorEnum>(source?.color ?? 'SESSION');
	let entryPlaceId = $state<string | null>(source?.placeId ?? null);
	let entryRoom = $state(source?.room ?? '');

	/** The entry's first and last track (it runs on those and every one between) */
	const seedTracks = source?.tracks.map((track) => track.id) ?? seed?.trackIds ?? [];
	const seedOrder = (id: string) => source?.tracks.find((t) => t.id === id)?.sortOrder ?? 0;
	const seedSorted = source
		? seedTracks.toSorted((a, b) => seedOrder(a) - seedOrder(b))
		: seedTracks;
	let entryTrackFrom = $state<string | null>(seedSorted[0] ?? null);
	let entryTrackTo = $state<string | null>(seedSorted[seedSorted.length - 1] ?? null);

	const dayTracks = $derived([...day.tracks].sort((a, b) => a.sortOrder - b.sortOrder));
	const trackFromIndex = $derived(dayTracks.findIndex((t) => t.id === entryTrackFrom));
	const trackToIndex = $derived(
		dayTracks.findIndex((t) => t.id === (entryTrackTo ?? entryTrackFrom))
	);
	const entryTrackIds = $derived(
		trackFromIndex === -1 || trackToIndex < trackFromIndex
			? []
			: normalizeTrackIds(
					dayTracks.map((t) => t.id),
					dayTracks.slice(trackFromIndex, trackToIndex + 1).map((t) => t.id)
				)
	);

	function setTrackFrom(id: string) {
		entryTrackFrom = id;
		if (trackToIndex < dayTracks.findIndex((t) => t.id === id)) entryTrackTo = id;
	}

	// Track whether end time was manually edited (to avoid overwriting user input)
	let entryEndTimeManuallySet = $state(!!source || !!seed);

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

	function setDuration(minutes: number) {
		const [h, min] = entryStartTime.split(':').map(Number);
		const end = h * 60 + min + minutes;
		if (end >= 24 * 60) return;
		entryEndTime = formatMinutes(end);
		entryEndTimeManuallySet = true;
	}

	/** Moves the entry to another day; its tracks go along if the day has ones of that name. */
	async function changeDay(dayId: string) {
		try {
			const targetTracks = await client.query.calendarTracks({
				__args: { where: { calendarDayId: { eq: dayId } } },
				id: true,
				name: true
			});
			const moved = retargetTrackRange(
				{ from: entryTrackFrom, to: entryTrackTo },
				day.tracks,
				targetTracks
			);
			entryTrackFrom = moved.from;
			entryTrackTo = moved.to;
			selectedDayId = dayId;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		}
	}

	async function writeEntry() {
		const fields = entryFields(
			{
				name: entryName,
				description: entryDescription,
				startTime: entryStartTime,
				endTime: entryEndTime,
				icon: entryIcon,
				color: entryColor,
				placeId: entryPlaceId,
				room: entryRoom,
				trackIds: entryTrackIds
			},
			day.date
		);
		if (isEdit && sourceEntryId) {
			await client.mutate.updateCalendarEntry({
				__args: { id: sourceEntryId, calendarDayId: selectedDayId, ...fields },
				id: true
			});
		} else {
			await client.mutate.createCalendarEntry({
				__args: { calendarDayId: selectedDayId, ...fields },
				id: true
			});
		}
	}

	const complete = $derived(
		!!entryName && !!entryStartTime && !!entryEndTime && entryTrackIds.length > 0
	);

	async function saveEntry() {
		if (!complete) return;
		if (await saveWithToast((loading) => (isLoading = loading), writeEntry)) onClose();
	}
</script>

<ActionModal
	title={isEdit ? m.calendarEditEntry() : m.calendarAddEntry()}
	boxClass="max-w-2xl"
	confirmLabel={isEdit ? m.save() : m.create()}
	confirmDisabled={!complete || entryTimeInvalid}
	loading={isLoading}
	onConfirm={saveEntry}
	{onClose}
>
	{#snippet footer()}
		{#if isEdit && sourceEntryId}
			<div class="flex gap-1">
				{#if onDelete}
					<button
						type="button"
						class="btn btn-ghost btn-error"
						onclick={() => onDelete(sourceEntryId)}
					>
						<i class="fas fa-trash"></i>
						{m.delete()}
					</button>
				{/if}
				{#if onDuplicate}
					<button type="button" class="btn btn-ghost" onclick={() => onDuplicate(sourceEntryId)}>
						<i class="fas fa-copy"></i>
						{m.calendarDuplicateEntry()}
					</button>
				{/if}
			</div>
		{/if}
	{/snippet}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.name()}</legend>
		<!-- svelte-ignore a11y_autofocus -->
		<input type="text" bind:value={entryName} class="input w-full" required autofocus />
	</fieldset>
	<div class="grid gap-4 {isEdit ? 'grid-cols-2' : ''}">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarDay()}</legend>
			<select
				class="select w-full"
				value={selectedDayId}
				onchange={(event) => changeDay(event.currentTarget.value)}
			>
				{#each days as option (option.id)}
					<option value={option.id}>
						{option.name} – {new Date(option.date).toLocaleDateString(undefined, {
							timeZone: 'UTC'
						})}
					</option>
				{/each}
			</select>
		</fieldset>
		{#if isEdit}
			<fieldset class="fieldset">
				<legend class="fieldset-legend">{m.calendarTrack()}</legend>
				<div class="flex items-center gap-2">
					<select
						class="select w-full"
						value={entryTrackFrom}
						onchange={(event) => setTrackFrom(event.currentTarget.value)}
					>
						{#each dayTracks as track (track.id)}
							<option value={track.id}>{track.name}</option>
						{/each}
					</select>
					{#if entryTrackFrom}
						<span class="text-base-content/60 text-sm">{m.calendarTrackThrough()}</span>
						<select class="select w-full" bind:value={entryTrackTo}>
							{#each dayTracks.slice(Math.max(trackFromIndex, 0)) as track (track.id)}
								<option value={track.id}>{track.name}</option>
							{/each}
						</select>
					{/if}
				</div>
			</fieldset>
		{/if}
	</div>
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
	<div class="-mt-2 flex flex-wrap items-center gap-1">
		<span class="text-base-content/60 mr-1 text-xs">{m.calendarDuration()}</span>
		{#each DURATIONS as minutes (minutes)}
			<button type="button" class="btn btn-xs" onclick={() => setDuration(minutes)}>
				{minutes}′
			</button>
		{/each}
	</div>
	{#if entryTimeInvalid}
		<p class="text-error -mt-2 text-xs">
			<i class="fas fa-triangle-exclamation"></i>
			{m.calendarEntryEndBeforeStart()}
		</p>
	{/if}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.description()}</legend>
		<textarea bind:value={entryDescription} class="textarea w-full"></textarea>
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarColor()}</legend>
		<ColorPaletteSelector value={entryColor} onchange={(c) => (entryColor = c)} />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarIcon()}</legend>
		<div class="flex flex-wrap gap-1">
			{#each ICON_PRESETS as icon (icon)}
				<button
					type="button"
					class="btn btn-square btn-sm {entryIcon === icon ? 'btn-primary' : 'btn-ghost'}"
					aria-label={icon}
					title={icon}
					onclick={() => (entryIcon = entryIcon === icon ? '' : icon)}
				>
					<i class="fa-sharp-duotone fa-solid fa-{icon}"></i>
				</button>
			{/each}
		</div>
		<div class="mt-1 flex items-center gap-2">
			<input type="text" bind:value={entryIcon} class="input flex-1" placeholder="gavel" />
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
