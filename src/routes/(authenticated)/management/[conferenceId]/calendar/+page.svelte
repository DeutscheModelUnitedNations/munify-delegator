<script lang="ts">
	import { graphql, cache } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import CalendarDisplay from '$lib/components/Calendar/CalendarDisplay.svelte';
	import ColorPaletteSelector from '$lib/components/Calendar/ColorPaletteSelector.svelte';
	import type { CalendarEntryColor } from '@prisma/client';
	import { translateCalendarEntryColor } from '$lib/services/enumTranslations';

	let { data }: { data: PageData } = $props();

	let calendarDays = $derived(data.calendarDays);
	let places = $derived(data.places);

	// Tab state
	let activeTab = $state<'preview' | 'days' | 'tracks' | 'places' | 'entries'>('preview');

	// Day/Track selector state for tracks and entries tabs
	let selectedDayId = $state<string | null>(null);

	let selectedDay = $derived(calendarDays.find((d) => d.id === selectedDayId));
	let tracksForSelectedDay = $derived(selectedDay?.tracks ?? []);
	let filterEntryTrackId = $state<string | null>(null);
	let sortedEntriesForSelectedDay = $derived(
		[...(selectedDay?.entries ?? [])].sort((a, b) => {
			const timeDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
			if (timeDiff !== 0) return timeDiff;
			const trackA = selectedDay?.tracks.find((t) => t.id === a.calendarTrackId);
			const trackB = selectedDay?.tracks.find((t) => t.id === b.calendarTrackId);
			return (trackA?.sortOrder ?? -1) - (trackB?.sortOrder ?? -1);
		})
	);
	let entriesForSelectedDay = $derived(
		filterEntryTrackId
			? sortedEntriesForSelectedDay.filter((e) => e.calendarTrackId === filterEntryTrackId)
			: sortedEntriesForSelectedDay
	);

	// Detect overlapping entries (same track, overlapping time ranges)
	let overlappingEntryIds = $derived.by(() => {
		const entries = sortedEntriesForSelectedDay;
		const ids = new Set<string>();
		for (let i = 0; i < entries.length; i++) {
			for (let j = i + 1; j < entries.length; j++) {
				const a = entries[i];
				const b = entries[j];
				if (a.calendarTrackId !== b.calendarTrackId) continue;
				const aStart = new Date(a.startTime).getTime();
				const aEnd = new Date(a.endTime).getTime();
				const bStart = new Date(b.startTime).getTime();
				const bEnd = new Date(b.endTime).getTime();
				if (aStart < bEnd && bStart < aEnd) {
					ids.add(a.id);
					ids.add(b.id);
				}
			}
		}
		return ids;
	});

	// Ensure selectedDayId is valid
	$effect(() => {
		if (
			calendarDays.length > 0 &&
			(!selectedDayId || !calendarDays.find((d) => d.id === selectedDayId))
		) {
			selectedDayId = calendarDays[0].id;
		}
	});

	// Reset track filter when day changes
	$effect(() => {
		selectedDayId;
		filterEntryTrackId = null;
	});

	// Loading state
	let isLoading = $state(false);

	// === Day CRUD ===
	const CreateDayMutation = graphql(`
		mutation CreateCalendarDay(
			$conferenceId: String!
			$name: String!
			$date: DateTime!
			$sortOrder: Int!
		) {
			createOneCalendarDay(
				data: { conferenceId: $conferenceId, name: $name, date: $date, sortOrder: $sortOrder }
			) {
				id
			}
		}
	`);

	const UpdateDayMutation = graphql(`
		mutation UpdateCalendarDay(
			$id: String!
			$name: StringFieldUpdateOperationsInput
			$date: DateTimeFieldUpdateOperationsInput
			$sortOrder: IntFieldUpdateOperationsInput
		) {
			updateOneCalendarDay(
				where: { id: $id }
				data: { name: $name, date: $date, sortOrder: $sortOrder }
			) {
				id
			}
		}
	`);

	const DeleteDayMutation = graphql(`
		mutation DeleteCalendarDay($id: String!) {
			deleteOneCalendarDay(where: { id: $id }) {
				id
			}
		}
	`);

	// Day modal state
	let showCreateDayModal = $state(false);
	let showEditDayModal = $state(false);
	let showDeleteDayModal = $state(false);
	let dayToEdit = $state<(typeof calendarDays)[0] | null>(null);
	let dayToDelete = $state<(typeof calendarDays)[0] | null>(null);

	let dayName = $state('');
	let dayDate = $state('');
	let daySortOrder = $state(0);

	function openCreateDay() {
		dayName = '';
		dayDate = '';
		daySortOrder = calendarDays.length;
		showCreateDayModal = true;
	}

	function openEditDay(day: (typeof calendarDays)[0]) {
		dayToEdit = day;
		dayName = day.name;
		dayDate = new Date(day.date).toISOString().split('T')[0];
		daySortOrder = day.sortOrder;
		showEditDayModal = true;
	}

	async function createDay() {
		if (!dayName || !dayDate) return;
		isLoading = true;
		try {
			await CreateDayMutation.mutate({
				conferenceId: data.conferenceId,
				name: dayName,
				date: new Date(dayDate),
				sortOrder: daySortOrder
			});
			cache.markStale();
			await invalidateAll();
			showCreateDayModal = false;
		} catch (error) {
			console.error('Failed to create day:', error);
		} finally {
			isLoading = false;
		}
	}

	async function updateDay() {
		if (!dayToEdit || !dayName || !dayDate) return;
		isLoading = true;
		try {
			await UpdateDayMutation.mutate({
				id: dayToEdit.id,
				name: { set: dayName },
				date: { set: new Date(dayDate) },
				sortOrder: { set: daySortOrder }
			});
			cache.markStale();
			await invalidateAll();
			showEditDayModal = false;
			dayToEdit = null;
		} catch (error) {
			console.error('Failed to update day:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deleteDay() {
		if (!dayToDelete) return;
		isLoading = true;
		try {
			await DeleteDayMutation.mutate({ id: dayToDelete.id });
			cache.markStale();
			await invalidateAll();
			showDeleteDayModal = false;
			dayToDelete = null;
		} catch (error) {
			console.error('Failed to delete day:', error);
		} finally {
			isLoading = false;
		}
	}

	// === Track CRUD ===
	const CreateTrackMutation = graphql(`
		mutation CreateCalendarTrack(
			$calendarDayId: String!
			$name: String!
			$description: String
			$sortOrder: Int!
		) {
			createOneCalendarTrack(
				data: {
					calendarDayId: $calendarDayId
					name: $name
					description: $description
					sortOrder: $sortOrder
				}
			) {
				id
			}
		}
	`);

	const UpdateTrackMutation = graphql(`
		mutation UpdateCalendarTrack(
			$id: String!
			$name: StringFieldUpdateOperationsInput
			$description: NullableStringFieldUpdateOperationsInput
			$sortOrder: IntFieldUpdateOperationsInput
		) {
			updateOneCalendarTrack(
				where: { id: $id }
				data: { name: $name, description: $description, sortOrder: $sortOrder }
			) {
				id
			}
		}
	`);

	const DeleteTrackMutation = graphql(`
		mutation DeleteCalendarTrack($id: String!) {
			deleteOneCalendarTrack(where: { id: $id }) {
				id
			}
		}
	`);

	let showCreateTrackModal = $state(false);
	let showEditTrackModal = $state(false);
	let showDeleteTrackModal = $state(false);
	let trackToEdit = $state<(typeof tracksForSelectedDay)[0] | null>(null);
	let trackToDelete = $state<(typeof tracksForSelectedDay)[0] | null>(null);

	let trackName = $state('');
	let trackDescription = $state('');
	let trackSortOrder = $state(0);

	function openCreateTrack() {
		trackName = '';
		trackDescription = '';
		trackSortOrder = tracksForSelectedDay.length;
		showCreateTrackModal = true;
	}

	function openEditTrack(track: (typeof tracksForSelectedDay)[0]) {
		trackToEdit = track;
		trackName = track.name;
		trackDescription = track.description ?? '';
		trackSortOrder = track.sortOrder;
		showEditTrackModal = true;
	}

	async function createTrack() {
		if (!trackName || !selectedDayId) return;
		isLoading = true;
		try {
			await CreateTrackMutation.mutate({
				calendarDayId: selectedDayId,
				name: trackName,
				description: trackDescription || null,
				sortOrder: trackSortOrder
			});
			cache.markStale();
			await invalidateAll();
			showCreateTrackModal = false;
		} catch (error) {
			console.error('Failed to create track:', error);
		} finally {
			isLoading = false;
		}
	}

	async function updateTrack() {
		if (!trackToEdit || !trackName) return;
		isLoading = true;
		try {
			await UpdateTrackMutation.mutate({
				id: trackToEdit.id,
				name: { set: trackName },
				description: { set: trackDescription || null },
				sortOrder: { set: trackSortOrder }
			});
			cache.markStale();
			await invalidateAll();
			showEditTrackModal = false;
			trackToEdit = null;
		} catch (error) {
			console.error('Failed to update track:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deleteTrack() {
		if (!trackToDelete) return;
		isLoading = true;
		try {
			await DeleteTrackMutation.mutate({ id: trackToDelete.id });
			cache.markStale();
			await invalidateAll();
			showDeleteTrackModal = false;
			trackToDelete = null;
		} catch (error) {
			console.error('Failed to delete track:', error);
		} finally {
			isLoading = false;
		}
	}

	// === Entry CRUD ===
	const CreateEntryMutation = graphql(`
		mutation CreateCalendarEntry(
			$calendarDayId: String!
			$calendarTrackId: String
			$name: String!
			$description: String
			$startTime: DateTime!
			$endTime: DateTime!
			$fontAwesomeIcon: String
			$color: CalendarEntryColor!
			$placeId: String
			$room: String
		) {
			createOneCalendarEntry(
				data: {
					calendarDayId: $calendarDayId
					calendarTrackId: $calendarTrackId
					name: $name
					description: $description
					startTime: $startTime
					endTime: $endTime
					fontAwesomeIcon: $fontAwesomeIcon
					color: $color
					placeId: $placeId
					room: $room
				}
			) {
				id
			}
		}
	`);

	const UpdateEntryMutation = graphql(`
		mutation UpdateCalendarEntry(
			$id: String!
			$name: StringFieldUpdateOperationsInput
			$description: NullableStringFieldUpdateOperationsInput
			$startTime: DateTimeFieldUpdateOperationsInput
			$endTime: DateTimeFieldUpdateOperationsInput
			$fontAwesomeIcon: NullableStringFieldUpdateOperationsInput
			$color: EnumCalendarEntryColorFieldUpdateOperationsInput
			$placeId: NullableStringFieldUpdateOperationsInput
			$room: NullableStringFieldUpdateOperationsInput
			$calendarTrackId: NullableStringFieldUpdateOperationsInput
			$calendarDayId: StringFieldUpdateOperationsInput
		) {
			updateOneCalendarEntry(
				where: { id: $id }
				data: {
					name: $name
					description: $description
					startTime: $startTime
					endTime: $endTime
					fontAwesomeIcon: $fontAwesomeIcon
					color: $color
					placeId: $placeId
					room: $room
					calendarTrackId: $calendarTrackId
					calendarDayId: $calendarDayId
				}
			) {
				id
			}
		}
	`);

	const DeleteEntryMutation = graphql(`
		mutation DeleteCalendarEntry($id: String!) {
			deleteOneCalendarEntry(where: { id: $id }) {
				id
			}
		}
	`);

	let showCreateEntryModal = $state(false);
	let showEditEntryModal = $state(false);
	let showDeleteEntryModal = $state(false);
	let showChangeDayModal = $state(false);
	let entryToEdit = $state<(typeof entriesForSelectedDay)[0] | null>(null);
	let entryToDelete = $state<(typeof entriesForSelectedDay)[0] | null>(null);
	let entryToMove = $state<(typeof entriesForSelectedDay)[0] | null>(null);
	let targetDayId = $state<string | null>(null);

	let entryName = $state('');
	let entryDescription = $state('');
	let entryStartTime = $state('');
	let entryEndTime = $state('');
	let entryIcon = $state('');
	let entryColor = $state<CalendarEntryColor>('SESSION');
	let entryPlaceId = $state<string | null>(null);
	let entryRoom = $state('');
	let entryTrackId = $state<string | null>(null);

	// Track whether end time was manually edited (to avoid overwriting user input)
	let entryEndTimeManuallySet = $state(false);

	// Auto-set end time to 1h after start time when start time changes
	$effect(() => {
		if (entryStartTime && !entryEndTimeManuallySet) {
			const [h, min] = entryStartTime.split(':').map(Number);
			const endH = h + 1;
			entryEndTime = `${endH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
		}
	});

	function toTimeString(d: Date): string {
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function combineDateTime(dayDate: Date, timeStr: string): Date {
		const d = new Date(dayDate);
		const [h, min] = timeStr.split(':').map(Number);
		d.setHours(h, min, 0, 0);
		return d;
	}

	function openCreateEntry() {
		entryName = '';
		entryDescription = '';
		entryStartTime = '09:00';
		entryEndTime = '10:00';
		entryEndTimeManuallySet = false;
		entryIcon = '';
		entryColor = 'SESSION';
		entryPlaceId = null;
		entryRoom = '';
		entryTrackId = null;
		showCreateEntryModal = true;
	}

	function duplicateEntry(entry: (typeof entriesForSelectedDay)[0]) {
		entryName = entry.name;
		entryDescription = entry.description ?? '';
		entryStartTime = toTimeString(new Date(entry.startTime));
		entryEndTime = toTimeString(new Date(entry.endTime));
		entryEndTimeManuallySet = true;
		entryIcon = entry.fontAwesomeIcon ?? '';
		entryColor = entry.color;
		entryPlaceId = entry.placeId ?? null;
		entryRoom = entry.room ?? '';
		entryTrackId = entry.calendarTrackId ?? null;
		showCreateEntryModal = true;
	}

	function openChangeDay(entry: (typeof entriesForSelectedDay)[0]) {
		entryToMove = entry;
		targetDayId = selectedDayId;
		showChangeDayModal = true;
	}

	async function changeDay() {
		if (!entryToMove || !targetDayId || targetDayId === selectedDayId) return;
		isLoading = true;
		try {
			const targetDay = calendarDays.find((d) => d.id === targetDayId);
			if (!targetDay) return;
			const oldStart = new Date(entryToMove.startTime);
			const oldEnd = new Date(entryToMove.endTime);
			const newDayDate = new Date(targetDay.date);
			const newStart = new Date(newDayDate);
			newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
			const newEnd = new Date(newDayDate);
			newEnd.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0);
			await UpdateEntryMutation.mutate({
				id: entryToMove.id,
				calendarDayId: { set: targetDayId },
				startTime: { set: newStart },
				endTime: { set: newEnd },
				calendarTrackId: { set: null }
			});
			cache.markStale();
			await invalidateAll();
			showChangeDayModal = false;
			entryToMove = null;
		} catch (error) {
			console.error('Failed to move entry:', error);
		} finally {
			isLoading = false;
		}
	}

	function openEditEntry(entry: (typeof entriesForSelectedDay)[0]) {
		entryToEdit = entry;
		entryName = entry.name;
		entryDescription = entry.description ?? '';
		entryStartTime = toTimeString(new Date(entry.startTime));
		entryEndTime = toTimeString(new Date(entry.endTime));
		entryEndTimeManuallySet = true;
		entryIcon = entry.fontAwesomeIcon ?? '';
		entryColor = entry.color;
		entryPlaceId = entry.placeId ?? null;
		entryRoom = entry.room ?? '';
		entryTrackId = entry.calendarTrackId ?? null;
		showEditEntryModal = true;
	}

	async function createEntry() {
		if (!entryName || !entryStartTime || !entryEndTime || !selectedDayId || !selectedDay) return;
		isLoading = true;
		try {
			const dayDate = new Date(selectedDay.date);
			await CreateEntryMutation.mutate({
				calendarDayId: selectedDayId,
				calendarTrackId: entryTrackId || null,
				name: entryName,
				description: entryDescription || null,
				startTime: combineDateTime(dayDate, entryStartTime),
				endTime: combineDateTime(dayDate, entryEndTime),
				fontAwesomeIcon: entryIcon || null,
				color: entryColor,
				placeId: entryPlaceId || null,
				room: entryRoom || null
			});
			cache.markStale();
			await invalidateAll();
			showCreateEntryModal = false;
		} catch (error) {
			console.error('Failed to create entry:', error);
		} finally {
			isLoading = false;
		}
	}

	async function updateEntry() {
		if (!entryToEdit || !entryName || !entryStartTime || !entryEndTime || !selectedDay) return;
		isLoading = true;
		try {
			const dayDate = new Date(selectedDay.date);
			await UpdateEntryMutation.mutate({
				id: entryToEdit.id,
				name: { set: entryName },
				description: { set: entryDescription || null },
				startTime: { set: combineDateTime(dayDate, entryStartTime) },
				endTime: { set: combineDateTime(dayDate, entryEndTime) },
				fontAwesomeIcon: { set: entryIcon || null },
				color: { set: entryColor },
				placeId: { set: entryPlaceId || null },
				room: { set: entryRoom || null },
				calendarTrackId: { set: entryTrackId || null }
			});
			cache.markStale();
			await invalidateAll();
			showEditEntryModal = false;
			entryToEdit = null;
		} catch (error) {
			console.error('Failed to update entry:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deleteEntry() {
		if (!entryToDelete) return;
		isLoading = true;
		try {
			await DeleteEntryMutation.mutate({ id: entryToDelete.id });
			cache.markStale();
			await invalidateAll();
			showDeleteEntryModal = false;
			entryToDelete = null;
		} catch (error) {
			console.error('Failed to delete entry:', error);
		} finally {
			isLoading = false;
		}
	}

	// === Place CRUD ===
	const CreatePlaceMutation = graphql(`
		mutation CreatePlace(
			$conferenceId: String!
			$name: String!
			$address: String
			$latitude: Float
			$longitude: Float
			$directions: String
			$info: String
			$websiteUrl: String
			$sitePlanDataURL: String
		) {
			createOnePlace(
				data: {
					conferenceId: $conferenceId
					name: $name
					address: $address
					latitude: $latitude
					longitude: $longitude
					directions: $directions
					info: $info
					websiteUrl: $websiteUrl
					sitePlanDataURL: $sitePlanDataURL
				}
			) {
				id
			}
		}
	`);

	const UpdatePlaceMutation = graphql(`
		mutation UpdatePlace(
			$id: String!
			$name: StringFieldUpdateOperationsInput
			$address: NullableStringFieldUpdateOperationsInput
			$latitude: NullableFloatFieldUpdateOperationsInput
			$longitude: NullableFloatFieldUpdateOperationsInput
			$directions: NullableStringFieldUpdateOperationsInput
			$info: NullableStringFieldUpdateOperationsInput
			$websiteUrl: NullableStringFieldUpdateOperationsInput
			$sitePlanDataURL: NullableStringFieldUpdateOperationsInput
		) {
			updateOnePlace(
				where: { id: $id }
				data: {
					name: $name
					address: $address
					latitude: $latitude
					longitude: $longitude
					directions: $directions
					info: $info
					websiteUrl: $websiteUrl
					sitePlanDataURL: $sitePlanDataURL
				}
			) {
				id
			}
		}
	`);

	const DeletePlaceMutation = graphql(`
		mutation DeletePlace($id: String!) {
			deleteOnePlace(where: { id: $id }) {
				id
			}
		}
	`);

	let showCreatePlaceModal = $state(false);
	let showEditPlaceModal = $state(false);
	let showDeletePlaceModal = $state(false);
	let placeToEdit = $state<(typeof places)[0] | null>(null);
	let placeToDelete = $state<(typeof places)[0] | null>(null);

	let placeName = $state('');
	let placeAddress = $state('');
	let placeLatitude = $state('');
	let placeLongitude = $state('');
	let placeDirections = $state('');
	let placeInfo = $state('');
	let placeWebsiteUrl = $state('');
	let placeSitePlanDataURL = $state<string | null>(null);

	function openCreatePlace() {
		placeName = '';
		placeAddress = '';
		placeLatitude = '';
		placeLongitude = '';
		placeDirections = '';
		placeInfo = '';
		placeWebsiteUrl = '';
		placeSitePlanDataURL = null;
		showCreatePlaceModal = true;
	}

	function openEditPlace(place: (typeof places)[0]) {
		placeToEdit = place;
		placeName = place.name;
		placeAddress = place.address ?? '';
		placeLatitude = place.latitude != null ? String(place.latitude) : '';
		placeLongitude = place.longitude != null ? String(place.longitude) : '';
		placeDirections = place.directions ?? '';
		placeInfo = place.info ?? '';
		placeWebsiteUrl = place.websiteUrl ?? '';
		placeSitePlanDataURL = place.sitePlanDataURL ?? null;
		showEditPlaceModal = true;
	}

	function handleSitePlanUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			alert('File too large (max 10MB)');
			input.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			placeSitePlanDataURL = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function createPlace() {
		if (!placeName) return;
		isLoading = true;
		try {
			await CreatePlaceMutation.mutate({
				conferenceId: data.conferenceId,
				name: placeName,
				address: placeAddress || null,
				latitude: placeLatitude ? parseFloat(placeLatitude) : null,
				longitude: placeLongitude ? parseFloat(placeLongitude) : null,
				directions: placeDirections || null,
				info: placeInfo || null,
				websiteUrl: placeWebsiteUrl || null,
				sitePlanDataURL: placeSitePlanDataURL
			});
			cache.markStale();
			await invalidateAll();
			showCreatePlaceModal = false;
		} catch (error) {
			console.error('Failed to create place:', error);
		} finally {
			isLoading = false;
		}
	}

	async function updatePlace() {
		if (!placeToEdit || !placeName) return;
		isLoading = true;
		try {
			await UpdatePlaceMutation.mutate({
				id: placeToEdit.id,
				name: { set: placeName },
				address: { set: placeAddress || null },
				latitude: { set: placeLatitude ? parseFloat(placeLatitude) : null },
				longitude: { set: placeLongitude ? parseFloat(placeLongitude) : null },
				directions: { set: placeDirections || null },
				info: { set: placeInfo || null },
				websiteUrl: { set: placeWebsiteUrl || null },
				sitePlanDataURL: { set: placeSitePlanDataURL }
			});
			cache.markStale();
			await invalidateAll();
			showEditPlaceModal = false;
			placeToEdit = null;
		} catch (error) {
			console.error('Failed to update place:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deletePlace() {
		if (!placeToDelete) return;
		isLoading = true;
		try {
			await DeletePlaceMutation.mutate({ id: placeToDelete.id });
			cache.markStale();
			await invalidateAll();
			showDeletePlaceModal = false;
			placeToDelete = null;
		} catch (error) {
			console.error('Failed to delete place:', error);
		} finally {
			isLoading = false;
		}
	}

	// Preview data
	let previewDays = $derived(
		calendarDays.map((day) => ({
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

	<!-- Preview Tab -->
	{#if activeTab === 'preview'}
		{#if previewDays.length === 0}
			<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
				<i class="fas fa-calendar-days text-5xl opacity-50"></i>
				<p class="mt-4 text-lg opacity-70">{m.calendarNoDays()}</p>
			</div>
		{:else}
			<CalendarDisplay days={previewDays} />
		{/if}
	{/if}

	<!-- Days Tab -->
	{#if activeTab === 'days'}
		<div class="flex justify-end">
			<button class="btn btn-primary btn-sm" onclick={openCreateDay}>
				<i class="fas fa-plus"></i>
				{m.calendarAddDay()}
			</button>
		</div>

		{#if calendarDays.length === 0}
			<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
				<i class="fas fa-calendar-days text-5xl opacity-50"></i>
				<p class="mt-4 text-lg opacity-70">{m.calendarNoDays()}</p>
				<button class="btn btn-primary mt-4" onclick={openCreateDay}>
					<i class="fas fa-plus"></i>
					{m.calendarAddDay()}
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>{m.calendarSortOrder()}</th>
							<th>{m.name()}</th>
							<th>{m.date()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each calendarDays as day (day.id)}
							<tr>
								<td>{day.sortOrder}</td>
								<td>{day.name}</td>
								<td>{new Date(day.date).toLocaleDateString()}</td>
								<td class="flex gap-2">
									<button class="btn btn-ghost btn-sm" onclick={() => openEditDay(day)}>
										<i class="fas fa-edit"></i>
									</button>
									<button
										class="btn btn-ghost btn-error btn-sm"
										onclick={() => {
											dayToDelete = day;
											showDeleteDayModal = true;
										}}
									>
										<i class="fas fa-trash"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- Tracks Tab -->
	{#if activeTab === 'tracks'}
		<div class="flex flex-wrap items-center justify-between gap-2">
			{#if calendarDays.length > 0}
				<select class="select select-bordered select-sm" bind:value={selectedDayId}>
					{#each calendarDays as day (day.id)}
						<option value={day.id}>{day.name}</option>
					{/each}
				</select>
			{/if}
			<button class="btn btn-primary btn-sm" onclick={openCreateTrack} disabled={!selectedDayId}>
				<i class="fas fa-plus"></i>
				{m.calendarAddTrack()}
			</button>
		</div>

		{#if tracksForSelectedDay.length === 0}
			<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
				<i class="fas fa-columns text-5xl opacity-50"></i>
				<p class="mt-4 text-lg opacity-70">{m.calendarNoTracks()}</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>{m.calendarSortOrder()}</th>
							<th>{m.name()}</th>
							<th>{m.description()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each tracksForSelectedDay as track (track.id)}
							<tr>
								<td>{track.sortOrder}</td>
								<td>{track.name}</td>
								<td class="max-w-xs truncate">{track.description ?? '–'}</td>
								<td class="flex gap-2">
									<button class="btn btn-ghost btn-sm" onclick={() => openEditTrack(track)}>
										<i class="fas fa-edit"></i>
									</button>
									<button
										class="btn btn-ghost btn-error btn-sm"
										onclick={() => {
											trackToDelete = track;
											showDeleteTrackModal = true;
										}}
									>
										<i class="fas fa-trash"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- Places Tab -->
	{#if activeTab === 'places'}
		<div class="flex justify-end">
			<button class="btn btn-primary btn-sm" onclick={openCreatePlace}>
				<i class="fas fa-plus"></i>
				{m.calendarAddPlace()}
			</button>
		</div>

		{#if places.length === 0}
			<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
				<i class="fas fa-location-dot text-5xl opacity-50"></i>
				<p class="mt-4 text-lg opacity-70">{m.calendarNoPlaces()}</p>
				<button class="btn btn-primary mt-4" onclick={openCreatePlace}>
					<i class="fas fa-plus"></i>
					{m.calendarAddPlace()}
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>{m.calendarPlaceName()}</th>
							<th>{m.calendarPlaceAddress()}</th>
							<th>{m.calendarPlaceLatitude()} / {m.calendarPlaceLongitude()}</th>
							<th>{m.calendarPlaceSitePlan()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each places as place (place.id)}
							<tr>
								<td>{place.name}</td>
								<td class="max-w-xs truncate">{place.address ?? '–'}</td>
								<td>
									{#if place.latitude != null && place.longitude != null}
										{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
									{:else}
										–
									{/if}
								</td>
								<td>
									{#if place.sitePlanDataURL}
										<i class="fas fa-file-pdf text-success"></i>
									{:else}
										–
									{/if}
								</td>
								<td class="flex gap-2">
									<button class="btn btn-ghost btn-sm" onclick={() => openEditPlace(place)}>
										<i class="fas fa-edit"></i>
									</button>
									<button
										class="btn btn-ghost btn-error btn-sm"
										onclick={() => {
											placeToDelete = place;
											showDeletePlaceModal = true;
										}}
									>
										<i class="fas fa-trash"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- Entries Tab -->
	{#if activeTab === 'entries'}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap items-center gap-2">
				{#if calendarDays.length > 0}
					<select class="select select-bordered select-sm" bind:value={selectedDayId}>
						{#each calendarDays as day (day.id)}
							<option value={day.id}>{day.name}</option>
						{/each}
					</select>
				{/if}
				{#if tracksForSelectedDay.length > 1}
					<select class="select select-bordered select-sm" bind:value={filterEntryTrackId}>
						<option value={null}>{m.calendarAllTracks()}</option>
						{#each tracksForSelectedDay as track (track.id)}
							<option value={track.id}>{track.name}</option>
						{/each}
					</select>
				{/if}
			</div>
			<button class="btn btn-primary btn-sm" onclick={openCreateEntry} disabled={!selectedDayId}>
				<i class="fas fa-plus"></i>
				{m.calendarAddEntry()}
			</button>
		</div>

		{#if entriesForSelectedDay.length === 0}
			<div class="bg-base-200 flex flex-col items-center justify-center rounded-lg p-12">
				<i class="fas fa-rectangle-list text-5xl opacity-50"></i>
				<p class="mt-4 text-lg opacity-70">{m.calendarNoEntries()}</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>{m.name()}</th>
							<th>{m.calendarStartTime()}</th>
							<th>{m.calendarEndTime()}</th>
							<th>{m.calendarTrack()}</th>
							<th>{m.calendarColor()}</th>
							<th>{m.actions()}</th>
						</tr>
					</thead>
					<tbody>
						{#each entriesForSelectedDay as entry (entry.id)}
							{@const track = tracksForSelectedDay.find((t) => t.id === entry.calendarTrackId)}
							{@const hasOverlap = overlappingEntryIds.has(entry.id)}
							<tr class={hasOverlap ? 'bg-warning/10' : ''}>
								<td>
									<div class="flex items-center gap-1.5">
										{#if hasOverlap}
											<div class="tooltip tooltip-right" data-tip={m.calendarEntryOverlap()}>
												<i class="fa-solid fa-triangle-exclamation text-warning text-xs"></i>
											</div>
										{/if}
										{#if entry.fontAwesomeIcon}
											<i class="fa-duotone fa-{entry.fontAwesomeIcon}"></i>
										{/if}
										{entry.name}
									</div>
								</td>
								<td
									>{new Date(entry.startTime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}</td
								>
								<td
									>{new Date(entry.endTime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}</td
								>
								<td>{track?.name ?? m.calendarAllTracks()}</td>
								<td
									><span class="badge badge-sm">{translateCalendarEntryColor(entry.color)}</span
									></td
								>
								<td class="flex gap-2">
									<button class="btn btn-ghost btn-sm" onclick={() => duplicateEntry(entry)}>
										<i class="fas fa-copy"></i>
									</button>
									<button class="btn btn-ghost btn-sm" onclick={() => openChangeDay(entry)}>
										<i class="fas fa-calendar-arrow-down"></i>
									</button>
									<button class="btn btn-ghost btn-sm" onclick={() => openEditEntry(entry)}>
										<i class="fas fa-edit"></i>
									</button>
									<button
										class="btn btn-ghost btn-error btn-sm"
										onclick={() => {
											entryToDelete = entry;
											showDeleteEntryModal = true;
										}}
									>
										<i class="fas fa-trash"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- Create Day Modal -->
{#if showCreateDayModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarAddDay()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.name()}</legend>
					<input type="text" bind:value={dayName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.date()}</legend>
					<input type="date" bind:value={dayDate} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarSortOrder()}</legend>
					<input type="number" bind:value={daySortOrder} class="input w-full" min="0" />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateDayModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createDay}
						disabled={isLoading || !dayName || !dayDate}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.create()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreateDayModal = false)}></div>
	</div>
{/if}

<!-- Edit Day Modal -->
{#if showEditDayModal && dayToEdit}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarEditDay()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.name()}</legend>
					<input type="text" bind:value={dayName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.date()}</legend>
					<input type="date" bind:value={dayDate} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarSortOrder()}</legend>
					<input type="number" bind:value={daySortOrder} class="input w-full" min="0" />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showEditDayModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={updateDay}
						disabled={isLoading || !dayName || !dayDate}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.save()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showEditDayModal = false)}></div>
	</div>
{/if}

<!-- Delete Day Modal -->
{#if showDeleteDayModal && dayToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarDeleteDay()}</h3>
			<p class="py-4">{m.calendarConfirmDeleteDay()}</p>
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={() => {
						showDeleteDayModal = false;
						dayToDelete = null;
					}}
				>
					{m.cancel()}
				</button>
				<button type="button" class="btn btn-error" onclick={deleteDay} disabled={isLoading}>
					{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
					{m.delete()}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showDeleteDayModal = false;
				dayToDelete = null;
			}}
		></div>
	</div>
{/if}

<!-- Create Track Modal -->
{#if showCreateTrackModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarAddTrack()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.name()}</legend>
					<input type="text" bind:value={trackName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea bind:value={trackDescription} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarSortOrder()}</legend>
					<input type="number" bind:value={trackSortOrder} class="input w-full" min="0" />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateTrackModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createTrack}
						disabled={isLoading || !trackName}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.create()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreateTrackModal = false)}></div>
	</div>
{/if}

<!-- Edit Track Modal -->
{#if showEditTrackModal && trackToEdit}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarEditTrack()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.name()}</legend>
					<input type="text" bind:value={trackName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.description()}</legend>
					<textarea bind:value={trackDescription} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarSortOrder()}</legend>
					<input type="number" bind:value={trackSortOrder} class="input w-full" min="0" />
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showEditTrackModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={updateTrack}
						disabled={isLoading || !trackName}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.save()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showEditTrackModal = false)}></div>
	</div>
{/if}

<!-- Delete Track Modal -->
{#if showDeleteTrackModal && trackToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarDeleteTrack()}</h3>
			<p class="py-4">{m.calendarConfirmDeleteTrack()}</p>
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={() => {
						showDeleteTrackModal = false;
						trackToDelete = null;
					}}
				>
					{m.cancel()}
				</button>
				<button type="button" class="btn btn-error" onclick={deleteTrack} disabled={isLoading}>
					{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
					{m.delete()}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showDeleteTrackModal = false;
				trackToDelete = null;
			}}
		></div>
	</div>
{/if}

<!-- Create Entry Modal -->
{#if showCreateEntryModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">{m.calendarAddEntry()}</h3>
			{#if selectedDay}
				<p class="text-base-content/60 mt-1 text-sm">
					{selectedDay.name} – {new Date(selectedDay.date).toLocaleDateString()}
				</p>
			{/if}
			<div class="mt-4 flex flex-col gap-4">
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
							class="input w-full"
							required
						/>
					</fieldset>
				</div>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarTrack()}</legend>
					<select class="select w-full" bind:value={entryTrackId}>
						<option value={null}>{m.calendarAllTracks()}</option>
						{#each tracksForSelectedDay as track (track.id)}
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
						<input
							type="text"
							bind:value={entryIcon}
							class="input flex-1"
							placeholder="e.g. gavel"
						/>
						{#if entryIcon}
							<i class="fa-duotone fa-{entryIcon} text-base-content/60 text-lg"></i>
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
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreateEntryModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createEntry}
						disabled={isLoading || !entryName || !entryStartTime || !entryEndTime}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.create()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreateEntryModal = false)}></div>
	</div>
{/if}

<!-- Edit Entry Modal -->
{#if showEditEntryModal && entryToEdit}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">{m.calendarEditEntry()}</h3>
			{#if selectedDay}
				<p class="text-base-content/60 mt-1 text-sm">
					{selectedDay.name} – {new Date(selectedDay.date).toLocaleDateString()}
				</p>
			{/if}
			<div class="mt-4 flex flex-col gap-4">
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
							class="input w-full"
							required
						/>
					</fieldset>
				</div>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarTrack()}</legend>
					<select class="select w-full" bind:value={entryTrackId}>
						<option value={null}>{m.calendarAllTracks()}</option>
						{#each tracksForSelectedDay as track (track.id)}
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
						<input
							type="text"
							bind:value={entryIcon}
							class="input flex-1"
							placeholder="e.g. gavel"
						/>
						{#if entryIcon}
							<i class="fa-duotone fa-{entryIcon} text-base-content/60 text-lg"></i>
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
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showEditEntryModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={updateEntry}
						disabled={isLoading || !entryName || !entryStartTime || !entryEndTime}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.save()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showEditEntryModal = false)}></div>
	</div>
{/if}

<!-- Delete Entry Modal -->
{#if showDeleteEntryModal && entryToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarDeleteEntry()}</h3>
			<p class="py-4">{m.calendarConfirmDeleteEntry()}</p>
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={() => {
						showDeleteEntryModal = false;
						entryToDelete = null;
					}}
				>
					{m.cancel()}
				</button>
				<button type="button" class="btn btn-error" onclick={deleteEntry} disabled={isLoading}>
					{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
					{m.delete()}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showDeleteEntryModal = false;
				entryToDelete = null;
			}}
		></div>
	</div>
{/if}

<!-- Change Day Modal -->
{#if showChangeDayModal && entryToMove}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarChangeDay()}</h3>
			<p class="text-base-content/60 mt-1 text-sm">{entryToMove.name}</p>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarTargetDay()}</legend>
					<select class="select w-full" bind:value={targetDayId}>
						{#each calendarDays as day (day.id)}
							<option value={day.id}>{day.name} – {new Date(day.date).toLocaleDateString()}</option>
						{/each}
					</select>
				</fieldset>
				<div class="modal-action">
					<button
						type="button"
						class="btn"
						onclick={() => {
							showChangeDayModal = false;
							entryToMove = null;
						}}
					>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={changeDay}
						disabled={isLoading || targetDayId === selectedDayId}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.save()}
					</button>
				</div>
			</div>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showChangeDayModal = false;
				entryToMove = null;
			}}
		></div>
	</div>
{/if}

<!-- Create Place Modal -->
{#if showCreatePlaceModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">{m.calendarAddPlace()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceName()}</legend>
					<input type="text" bind:value={placeName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceAddress()}</legend>
					<input type="text" bind:value={placeAddress} class="input w-full" />
				</fieldset>
				<div class="grid grid-cols-2 gap-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.calendarPlaceLatitude()}</legend>
						<input type="number" step="any" bind:value={placeLatitude} class="input w-full" />
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.calendarPlaceLongitude()}</legend>
						<input type="number" step="any" bind:value={placeLongitude} class="input w-full" />
					</fieldset>
				</div>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceDirections()}</legend>
					<textarea bind:value={placeDirections} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceInfo()}</legend>
					<textarea bind:value={placeInfo} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceWebsite()}</legend>
					<input type="url" bind:value={placeWebsiteUrl} class="input w-full" />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceSitePlan()}</legend>
					<input
						type="file"
						accept="application/pdf"
						class="file-input w-full"
						onchange={handleSitePlanUpload}
					/>
					{#if placeSitePlanDataURL}
						<span class="text-success mt-1 text-xs">
							<i class="fas fa-check-circle"></i>
							PDF
						</span>
					{/if}
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showCreatePlaceModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={createPlace}
						disabled={isLoading || !placeName}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.create()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showCreatePlaceModal = false)}></div>
	</div>
{/if}

<!-- Edit Place Modal -->
{#if showEditPlaceModal && placeToEdit}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="text-lg font-bold">{m.calendarEditPlace()}</h3>
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceName()}</legend>
					<input type="text" bind:value={placeName} class="input w-full" required />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceAddress()}</legend>
					<input type="text" bind:value={placeAddress} class="input w-full" />
				</fieldset>
				<div class="grid grid-cols-2 gap-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.calendarPlaceLatitude()}</legend>
						<input type="number" step="any" bind:value={placeLatitude} class="input w-full" />
					</fieldset>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.calendarPlaceLongitude()}</legend>
						<input type="number" step="any" bind:value={placeLongitude} class="input w-full" />
					</fieldset>
				</div>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceDirections()}</legend>
					<textarea bind:value={placeDirections} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceInfo()}</legend>
					<textarea bind:value={placeInfo} class="textarea w-full"></textarea>
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceWebsite()}</legend>
					<input type="url" bind:value={placeWebsiteUrl} class="input w-full" />
				</fieldset>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.calendarPlaceSitePlan()}</legend>
					<input
						type="file"
						accept="application/pdf"
						class="file-input w-full"
						onchange={handleSitePlanUpload}
					/>
					{#if placeSitePlanDataURL}
						<div class="mt-1 flex items-center gap-2">
							<span class="text-success text-xs">
								<i class="fas fa-check-circle"></i>
								PDF
							</span>
							<a
								href={placeSitePlanDataURL}
								download="site-plan.pdf"
								class="link link-primary text-xs"
							>
								{m.calendarPlaceSitePlanDownload()}
							</a>
						</div>
					{/if}
				</fieldset>
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showEditPlaceModal = false)}>
						{m.cancel()}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={updatePlace}
						disabled={isLoading || !placeName}
					>
						{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
						{m.save()}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" onclick={() => (showEditPlaceModal = false)}></div>
	</div>
{/if}

<!-- Delete Place Modal -->
{#if showDeletePlaceModal && placeToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.calendarDeletePlace()}</h3>
			<p class="py-4">{m.calendarConfirmDeletePlace()}</p>
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={() => {
						showDeletePlaceModal = false;
						placeToDelete = null;
					}}
				>
					{m.cancel()}
				</button>
				<button type="button" class="btn btn-error" onclick={deletePlace} disabled={isLoading}>
					{#if isLoading}<span class="loading loading-spinner loading-sm"></span>{/if}
					{m.delete()}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			onclick={() => {
				showDeletePlaceModal = false;
				placeToDelete = null;
			}}
		></div>
	</div>
{/if}
