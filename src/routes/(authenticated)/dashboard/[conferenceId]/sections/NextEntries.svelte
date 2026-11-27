<!--
	@component
	Where the signed-in person has to be: what is on now on their track, or how long until the next
	thing starts, then what comes after it (`UpcomingEntries`). Follows the team's changes and the
	clock. Shows nothing while the schedule is switched off or when nothing is left.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchCalendarDays } from '#lib/api/calendarDays';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
	import { entriesForSeat, seatOf } from '#lib/components/calendar/calendarNow';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { m } from '#lib/paraglide/messages';
	import UpcomingEntries from './UpcomingEntries.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const [conference, liveDays, participation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				timezone: true,
				showCalendar: true
			}),
			fetchCalendarDays(conferenceId),
			fetchMyParticipation(conferenceId)
		])
	);

	const snapshot = liveSnapshot<(typeof liveDays)[number]>();
	const days = $derived(snapshot(liveDays));
	const seat = $derived(seatOf(participation));
	const entries = $derived(entriesForSeat({ days, seat }));
</script>

{#if conference.showCalendar}
	<UpcomingEntries {days} {entries} timezone={conference.timezone}>
		{#snippet frame(content)}
			<DashboardSection
				icon="calendar-dots"
				title={m.calendarNextEntries()}
				tourAnchor="dashboard.next-entries"
			>
				<div class="flex flex-col gap-3">
					{@render content()}
					<a
						class="btn btn-ghost btn-sm text-primary -ml-3 self-start"
						href={resolve('/(authenticated)/dashboard/[conferenceId]/calendar', { conferenceId })}
					>
						{m.calendarFullSchedule()}
						<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
					</a>
				</div>
			</DashboardSection>
		{/snippet}
	</UpcomingEntries>
{/if}
