<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { calendarDayFields, calendarDaysOf } from '#lib/api/calendarDays';
	import CalendarDisplay from '#lib/components/calendar/CalendarDisplay.svelte';
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import { ownTrackIds, personalCalendarDays } from '#lib/components/calendar/personalCalendar';

	/**
	 * The schedule as this person sees it, so participant care can tell where they have to be at
	 * any time. The team reads every entry, so the person's survey choices are applied here, as the
	 * API's read rules do for them, and their own track is preselected.
	 */
	interface Props {
		conferenceId: string;
		userId: string;
		/** The committee and role ids the tracks are for, read out of the card's registrations */
		seat: Seat;
	}

	let { conferenceId, userId, seat }: Props = $props();

	const [conference, calendarDays, answers] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				timezone: true,
				showCalendar: true
			}),
			client.liveQuery.calendarDays({
				__args: calendarDaysOf(conferenceId),
				...calendarDayFields,
				entries: { ...calendarDayFields.entries, surveyOptions: { id: true } }
			}),
			client.liveQuery.surveyAnswers({
				__args: {
					where: {
						user: { id: { eq: userId } },
						question: { conferenceId: { eq: conferenceId } }
					}
				},
				option: { id: true }
			})
		])
	);

	const days = $derived(
		personalCalendarDays({
			days: calendarDays,
			pickedOptionIds: answers.map((answer) => answer.option.id)
		})
	);
	// Read off the plain copies, so the track ids do not follow every change of the live result
	const ownTracks = $derived(ownTrackIds({ days, seat }));
	const empty = $derived(days.every((day) => day.entries.length === 0));
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-base-content/60">{m.userCardCalendarHint()}</p>
	{#if !conference.showCalendar}
		<div class="alert alert-warning" role="status">
			<i aria-hidden="true" class="ph-duotone ph-eye-slash"></i>
			<span>{m.userCardCalendarNotShown()}</span>
		</div>
	{/if}
	{#if empty}
		<div class="alert alert-info">
			<i aria-hidden="true" class="ph-duotone ph-calendar-blank"></i>
			<span>{m.userCardNoCalendarEntries()}</span>
		</div>
	{:else}
		<CalendarDisplay {days} timezone={conference.timezone} ownTrackIds={ownTracks} />
	{/if}
</div>
