<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import TargetDayField from './TargetDayField.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { copiedEntryArgs } from './copyDayEntries';

	interface Props {
		conferenceId: string;
		/** The day whose entries are copied. */
		dayId: string;
		dayName: string;
		entryCount: number;
		onClose: () => void;
	}

	let { conferenceId, dayId, dayName, entryCount, onClose }: Props = $props();

	const otherDays = $derived(
		await client.liveQuery.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId }, id: { ne: dayId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true,
			date: true
		})
	);

	let copyTargetDayId = $state<string | null>(null);
	let isLoading = $state(false);

	// Preselect the first other day, as the copy button always did
	$effect(() => {
		if (!copyTargetDayId && otherDays.length > 0) copyTargetDayId = otherDays[0].id;
	});

	async function copyDayEntries() {
		const targetDay = otherDays.find((d) => d.id === copyTargetDayId);
		if (!targetDay) return;
		isLoading = true;
		try {
			// One-shot reads: the full entries and both days' tracks are only needed for the copy.
			const [source, targetTracks] = await Promise.all([
				client.query.calendarDay({
					__args: { id: dayId },
					id: true,
					tracks: { id: true, name: true },
					entries: {
						id: true,
						name: true,
						description: true,
						startTime: true,
						endTime: true,
						fontAwesomeIcon: true,
						color: true,
						placeId: true,
						room: true,
						tracks: { id: true }
					}
				}),
				client.query.calendarTracks({
					__args: { where: { calendarDayId: { eq: targetDay.id } } },
					id: true,
					name: true
				})
			]);
			const tracks = { source: source.tracks, target: targetTracks };
			// An entry none of whose tracks the target day has would run nowhere, so it stays behind
			const mutations = source.entries
				.map((entry) => copiedEntryArgs(entry, targetDay, tracks))
				.filter((args) => args.calendarTrackIds.length > 0)
				.map((args) => client.mutate.createCalendarEntry({ __args: args, id: true }));
			const results = await Promise.allSettled(mutations);
			const failures = results.filter((r) => r.status === 'rejected');
			if (failures.length > 0) {
				console.error(`Failed to copy ${failures.length} entries:`, failures);
			}
			onClose();
		} catch (error) {
			console.error('Failed to copy entries:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<ActionModal
	title={m.calendarCopyDayEntries()}
	confirmLabel={m.calendarCopyDayEntriesConfirm({
		count: entryCount.toString()
	})}
	confirmDisabled={!copyTargetDayId}
	loading={isLoading}
	onConfirm={copyDayEntries}
	{onClose}
>
	{#snippet subtitle()}
		{m.calendarCopyDayEntriesDescription({
			count: entryCount.toString(),
			day: dayName
		})}
	{/snippet}
	<TargetDayField days={otherDays} bind:value={copyTargetDayId} />
</ActionModal>
