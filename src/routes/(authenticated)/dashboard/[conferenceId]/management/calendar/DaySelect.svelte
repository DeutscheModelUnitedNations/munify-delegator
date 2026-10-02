<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';

	interface Props {
		conferenceId: string;
		selectedDayId: string | null;
	}

	let { conferenceId, selectedDayId = $bindable() }: Props = $props();

	const days = $derived(
		await client.liveQuery.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true
		})
	);

	// Keep the selection pointing at a day that exists
	$effect(() => {
		if (days.length > 0 && (!selectedDayId || !days.find((d) => d.id === selectedDayId))) {
			selectedDayId = days[0].id;
		}
	});
</script>

{#if days.length > 0}
	<select class="select select-bordered select-sm" bind:value={selectedDayId}>
		{#each days as day (day.id)}
			<option value={day.id}>{day.name}</option>
		{/each}
	</select>
{/if}
