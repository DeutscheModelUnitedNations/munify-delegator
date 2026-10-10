<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import DashboardSection from './DashboardSection.svelte';
	import CalendarDisplay from '$lib/components/calendar/CalendarDisplay.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		timezone?: string;
	}

	let { conferenceId, timezone = 'UTC' }: Props = $props();

	let calendarDays = $state<Awaited<ReturnType<typeof fetchCalendarDays>> | undefined>();

	function fetchCalendarDays() {
		return client.query.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true,
			date: true,
			sortOrder: true,
			tracks: { id: true, name: true, description: true, sortOrder: true },
			entries: {
				id: true,
				startTime: true,
				endTime: true,
				name: true,
				description: true,
				fontAwesomeIcon: true,
				color: true,
				place: {
					id: true,
					name: true,
					address: true,
					latitude: true,
					longitude: true,
					directions: true,
					info: true,
					websiteUrl: true
				},
				room: true,
				tracks: { id: true }
			}
		});
	}

	$effect(() => {
		void fetchCalendarDays().then((result) => {
			calendarDays = result;
		});
	});

	let days = $derived(
		(calendarDays ?? []).map((day) => ({
			...day,
			tracks: [...day.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
			entries: [...day.entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
		}))
	);
</script>

{#if days.length > 0}
	<DashboardSection
		icon="calendar-days"
		title={m.calendarSectionTitle()}
		description={m.calendarSectionDescription()}
		collapsible
		defaultCollapsed
	>
		<CalendarDisplay {days} {timezone} />
	</DashboardSection>
{/if}
