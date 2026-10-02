<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import TargetDayField from './TargetDayField.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { moveToDay } from './calendarTime';
	import { moveTargetDay } from './calendarEditing';

	interface Props {
		conferenceId: string;
		/** The day the entry is on now. */
		currentDayId: string;
		entry: { id: string; name: string; startTime: Date; endTime: Date };
		onClose: () => void;
	}

	let { conferenceId, currentDayId, entry, onClose }: Props = $props();

	const calendarDays = $derived(
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

	let targetDayId = $state(untrack(() => currentDayId));
	let isLoading = $state(false);

	async function changeDay() {
		const targetDay = moveTargetDay(calendarDays, targetDayId, currentDayId);
		if (!targetDay) return;
		isLoading = true;
		try {
			await client.mutate.updateCalendarEntry({
				__args: {
					id: entry.id,
					calendarDayId: targetDay.id,
					startTime: moveToDay(entry.startTime, targetDay.date),
					endTime: moveToDay(entry.endTime, targetDay.date),
					calendarTrackId: null
				},
				id: true
			});
			onClose();
		} catch (error) {
			console.error('Failed to move entry:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<ActionModal
	title={m.calendarChangeDay()}
	confirmLabel={m.save()}
	confirmDisabled={targetDayId === currentDayId}
	loading={isLoading}
	onConfirm={changeDay}
	{onClose}
>
	{#snippet subtitle()}
		{entry.name}
	{/snippet}
	<TargetDayField days={calendarDays} bind:value={targetDayId} />
</ActionModal>
