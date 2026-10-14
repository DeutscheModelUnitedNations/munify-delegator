<script lang="ts">
	import { untrack } from 'svelte';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import LabeledField from '$lib/components/form/LabeledField.svelte';
	import { saveWithToast } from '$lib/helpers/saveWithToast';
	import { m } from '$lib/paraglide/messages';
	import { trackFields } from './calendarEditing';
	import type { MatrixDay, TrackRow } from './trackMatrix';

	interface Props {
		days: MatrixDay[];
		rows: TrackRow[];
		/** The row to edit; a new track is added to every day when this is left out */
		row?: TrackRow;
		onClose: () => void;
	}

	let { days, rows, row, onClose }: Props = $props();

	// Seeded once: re-reading the row while someone types would discard their edits
	let name = $state(untrack(() => row?.name ?? ''));
	let description = $state(untrack(() => row?.description ?? ''));
	let isLoading = $state(false);

	async function writeRow() {
		if (row) {
			const previous = row.name;
			const tracks = days.flatMap((day) => day.tracks).filter((t) => t.name === previous);
			await Promise.all(
				tracks.map((track) =>
					client.mutate.updateCalendarTrack({
						__args: { id: track.id, ...trackFields(name, description, track.sortOrder) },
						id: true
					})
				)
			);
			return;
		}
		const index = rows.length;
		await Promise.all(
			days.map((day) =>
				client.mutate.createCalendarTrack({
					__args: { calendarDayId: day.id, ...trackFields(name, description, index) },
					id: true
				})
			)
		);
	}

	async function save() {
		if (!name) return;
		if (await saveWithToast((loading) => (isLoading = loading), writeRow)) onClose();
	}
</script>

<ActionModal
	title={row ? m.calendarEditTrack() : m.calendarAddTrack()}
	confirmLabel={row ? m.save() : m.create()}
	confirmDisabled={!name}
	loading={isLoading}
	onConfirm={save}
	{onClose}
>
	<LabeledField label={m.name()} bind:value={name} required />
	<LabeledField label={m.description()} bind:value={description} multiline />
</ActionModal>
