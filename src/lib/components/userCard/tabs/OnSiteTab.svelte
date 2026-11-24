<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import AttendanceSection from '../AttendanceSection.svelte';
	import NsaCardSection from '../NsaCardSection.svelte';
	import AccessRows from '../sections/AccessRows.svelte';
	import PersonalCalendar from '../sections/PersonalCalendar.svelte';
	import SurveyAnswers from '../sections/SurveyAnswers.svelte';

	/** The conference itself: access and attendance, the survey choices and the schedule. */
	interface Props {
		userId: string;
		conferenceId: string;
		seat: Seat;
		/** The person has a `conferenceParticipant` row, which access and attendance stand on */
		participant: boolean;
		/** The person follows the conference's schedule and answers its surveys */
		schedule: boolean;
	}

	let { userId, conferenceId, seat, participant, schedule }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
		{#if participant}
			<section class="flex min-w-0 flex-col gap-3">
				<h3 class="text-lg font-bold">{m.accessAndAttendance()}</h3>
				<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
					<AccessRows {userId} {conferenceId} />
					<NsaCardSection {userId} {conferenceId} />
					<AttendanceSection {userId} {conferenceId} />
				</div>
			</section>
		{/if}
		{#if schedule}
			<section class="flex min-w-0 flex-col gap-3">
				<h3 class="text-lg font-bold">{m.survey()}</h3>
				<SurveyAnswers {conferenceId} {userId} />
			</section>
		{/if}
	</div>
	{#if schedule}
		<section class="flex min-w-0 flex-col gap-3">
			<h3 class="text-lg font-bold">{m.calendar()}</h3>
			<PersonalCalendar {conferenceId} {userId} {seat} />
		</section>
	{/if}
</div>
