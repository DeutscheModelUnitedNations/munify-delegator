<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import CalendarListTable from './CalendarListTable.svelte';
	import RowActionButton from './RowActionButton.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import {
		calendarDayExportSchema,
		type CalendarDayExportData
	} from '$lib/schemata/calendarDayExport';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { exportCalendarDay } from './exportCalendarDay';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const calendarDays = $derived(
		await client.liveQuery.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true,
			date: true,
			sortOrder: true
		})
	);

	type Day = (typeof calendarDays)[number];

	let isLoading = $state(false);
	let showDayModal = $state(false);
	let dayToEdit = $state<Day | null>(null);
	let dayToDelete = $state<Day | null>(null);

	let dayName = $state('');
	let dayDate = $state('');
	let daySortOrder = $state(0);

	// === Day Import ===
	let importData = $state<CalendarDayExportData | null>(null);
	let importError = $state('');

	function handleImportFileUpload(event: Event) {
		if (!(event.target instanceof HTMLInputElement)) return;
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				if (typeof reader.result !== 'string') return;
				const raw = JSON.parse(reader.result);
				const result = calendarDayExportSchema.safeParse(raw);
				if (!result.success) {
					importData = null;
					importError = m.calendarImportInvalidJSON();
					return;
				}
				importData = result.data;
				importError = '';
			} catch {
				importData = null;
				importError = m.calendarImportInvalidJSON();
			}
		};
		reader.readAsText(file);
	}

	function openCreateDay() {
		dayToEdit = null;
		dayName = '';
		dayDate = '';
		daySortOrder = calendarDays.length;
		importData = null;
		importError = '';
		showDayModal = true;
	}

	function openEditDay(day: Day) {
		dayToEdit = day;
		dayName = day.name;
		dayDate = new Date(day.date).toISOString().split('T')[0];
		daySortOrder = day.sortOrder;
		showDayModal = true;
	}

	function closeDayModal() {
		showDayModal = false;
		dayToEdit = null;
	}

	async function saveDay() {
		if (!dayName || !dayDate) return;
		isLoading = true;
		const fields = { name: dayName, date: new Date(dayDate), sortOrder: daySortOrder };
		try {
			if (dayToEdit) {
				await client.mutate.updateCalendarDay({
					__args: { id: dayToEdit.id, ...fields },
					id: true
				});
			} else if (importData) {
				await client.mutate.importCalendarDay({
					__args: { conferenceId, ...fields, importData },
					id: true
				});
			} else {
				await client.mutate.createCalendarDay({ __args: { conferenceId, ...fields }, id: true });
			}
			closeDayModal();
		} catch (error) {
			console.error(dayToEdit ? 'Failed to update day:' : 'Failed to create day:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deleteDay() {
		if (!dayToDelete) return;
		try {
			await client.mutate.deleteCalendarDay({ __args: { id: dayToDelete.id } });
			dayToDelete = null;
		} catch (error) {
			console.error('Failed to delete day:', error);
		}
	}
</script>

{#snippet importField()}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarImportFromFile()}</legend>
		<input type="file" accept=".json" class="file-input w-full" onchange={handleImportFileUpload} />
		{#if importError}
			<p class="text-error mt-1 text-xs">{importError}</p>
		{/if}
		{#if importData}
			<p class="text-success mt-1 text-xs">
				<i class="fas fa-check-circle"></i>
				{m.calendarImportPreview({
					tracks: importData.tracks.length.toString(),
					entries: importData.entries.length.toString()
				})}
			</p>
		{/if}
	</fieldset>
{/snippet}

<div class="flex justify-end">
	<button class="btn btn-primary btn-sm" onclick={openCreateDay}>
		<i class="fas fa-plus"></i>
		{m.calendarAddDay()}
	</button>
</div>

<CalendarListTable
	empty={calendarDays.length === 0}
	emptyIcon="fa-calendar-days"
	emptyText={m.calendarNoDays()}
	headers={[m.calendarSortOrder(), m.name(), m.date(), m.actions()]}
>
	{#snippet emptyAction()}
		<button class="btn btn-primary mt-4" onclick={openCreateDay}>
			<i class="fas fa-plus"></i>
			{m.calendarAddDay()}
		</button>
	{/snippet}
	{#each calendarDays as day (day.id)}
		<tr>
			<td>{day.sortOrder}</td>
			<td>{day.name}</td>
			<td>{new Date(day.date).toLocaleDateString()}</td>
			<td class="flex gap-2">
				<button
					class="btn btn-ghost btn-sm"
					onclick={() => exportCalendarDay(day.id)}
					title={m.calendarExportDay()}
				>
					<i class="fas fa-download"></i>
				</button>
				<RowActionButton
					icon="fa-edit"
					label={m.calendarEditDay()}
					onclick={() => openEditDay(day)}
				/>
				<RowActionButton
					icon="fa-trash"
					label={m.calendarDeleteDay()}
					danger
					onclick={() => (dayToDelete = day)}
				/>
			</td>
		</tr>
	{/each}
</CalendarListTable>

{#if showDayModal}
	<ActionModal
		title={dayToEdit ? m.calendarEditDay() : m.calendarAddDay()}
		confirmLabel={dayToEdit ? m.save() : m.create()}
		confirmDisabled={!dayName || !dayDate}
		loading={isLoading}
		onConfirm={saveDay}
		onClose={closeDayModal}
	>
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
		{#if !dayToEdit}
			{@render importField()}
		{/if}
	</ActionModal>
{/if}

{#if dayToDelete}
	<ConfirmDeleteModal
		title={m.calendarDeleteDay()}
		text={m.calendarConfirmDeleteDay()}
		onConfirm={deleteDay}
		onClose={() => (dayToDelete = null)}
	/>
{/if}
