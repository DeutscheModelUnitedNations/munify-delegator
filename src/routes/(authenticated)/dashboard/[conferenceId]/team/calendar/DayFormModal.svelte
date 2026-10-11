<script lang="ts">
	import { untrack } from 'svelte';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import LabeledField from '$lib/components/form/LabeledField.svelte';
	import { saveWithToast } from '$lib/helpers/saveWithToast';
	import { m } from '$lib/paraglide/messages';
	import type { CalendarDayExportData } from '$lib/schemata/calendarDayExport';
	import { dayFields, parseDayImport } from './calendarEditing';

	interface Props {
		conferenceId: string;
		/** The day to edit; a new day is added when this is left out */
		day?: { id: string; name: string; date: Date | string; sortOrder: number };
		/** The conference's other days, which decide where the day is placed */
		otherDays: { date: Date | string; sortOrder: number }[];
		onClose: () => void;
	}

	let { conferenceId, day, otherDays, onClose }: Props = $props();

	// Seeded once: re-reading the row while someone types would discard their edits
	let name = $state(untrack(() => day?.name ?? ''));
	let date = $state(untrack(() => (day ? new Date(day.date).toISOString().split('T')[0] : '')));
	let isLoading = $state(false);

	let importData = $state<CalendarDayExportData | null>(null);
	let importError = $state('');

	function handleImportFileUpload(event: Event) {
		if (!(event.target instanceof HTMLInputElement)) return;
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const parsed = parseDayImport(reader.result);
			importData = parsed.data;
			importError = parsed.invalid ? m.calendarImportInvalidJSON() : '';
		};
		reader.readAsText(file);
	}

	async function writeDay() {
		const fields = dayFields(name, date, otherDays, day);
		if (day) {
			await client.mutate.updateCalendarDay({ __args: { id: day.id, ...fields }, id: true });
		} else if (importData) {
			await client.mutate.importCalendarDay({
				__args: { conferenceId, ...fields, importData },
				id: true
			});
		} else {
			await client.mutate.createCalendarDay({ __args: { conferenceId, ...fields }, id: true });
		}
	}

	async function save() {
		if (!name || !date) return;
		if (await saveWithToast((loading) => (isLoading = loading), writeDay)) onClose();
	}
</script>

<ActionModal
	title={day ? m.calendarEditDay() : m.calendarAddDay()}
	confirmLabel={day ? m.save() : m.create()}
	confirmDisabled={!name || !date}
	loading={isLoading}
	onConfirm={save}
	{onClose}
>
	<LabeledField label={m.name()} bind:value={name} required />
	<LabeledField label={m.date()} type="date" bind:value={date} required />
	{#if !day}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarImportFromFile()}</legend>
			<input
				type="file"
				accept=".json"
				class="file-input w-full"
				onchange={handleImportFileUpload}
			/>
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
	{/if}
</ActionModal>
