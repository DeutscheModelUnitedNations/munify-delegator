<script lang="ts">
	import { graphql } from '$houdini';
	import DashboardSection from './DashboardSection.svelte';
	import CalendarDisplay from '$lib/components/Calendar/CalendarDisplay.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const calendarStore = graphql(`
		query DashboardCalendarQuery($conferenceId: String!) {
			findManyCalendarDays(
				where: { conferenceId: { equals: $conferenceId } }
				orderBy: { sortOrder: asc }
			) {
				id
				name
				date
				sortOrder
				tracks {
					id
					name
					description
					sortOrder
				}
				entries {
					id
					startTime
					endTime
					name
					description
					fontAwesomeIcon
					color
					place {
						id
						name
						address
						latitude
						longitude
						directions
						info
						websiteUrl
					}
					room
					calendarTrackId
				}
			}
		}
	`);

	$effect(() => {
		calendarStore.fetch({ variables: { conferenceId } });
	});

	let days = $derived(
		($calendarStore.data?.findManyCalendarDays ?? []).map((day) => ({
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

{#if days.length > 0}
	<DashboardSection
		icon="calendar-days"
		title={m.calendarSectionTitle()}
		description={m.calendarSectionDescription()}
		collapsible
		defaultCollapsed
	>
		<CalendarDisplay {days} />
	</DashboardSection>
{/if}
