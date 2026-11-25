<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import PaperList from '../sections/PaperList.svelte';
	import PersonalCalendar from '../sections/PersonalCalendar.svelte';
	import SurveyAnswers from '../sections/SurveyAnswers.svelte';
	import UpcomingEntries from '../sections/UpcomingEntries.svelte';
	import Section from '../ui/Section.svelte';

	/**
	 * What the person does at the conference: where they have to be now and next, their papers, their
	 * survey choices, and the schedule these decide.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		seat: Seat;
		/** The person follows the conference's schedule and answers its surveys */
		schedule: boolean;
		/** Wrote papers, or is in a delegation that does */
		papers: boolean;
	}

	let { userId, conferenceId, seat, schedule, papers }: Props = $props();
</script>

<!-- In one column what is next comes first; in two it stands above the calendar, which moves up to
     the top where nothing is next. -->
<div
	class="grid grid-cols-1 items-start gap-x-12 gap-y-6 group-data-wide/card:min-[1700px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] group-data-wide/card:min-[1700px]:grid-rows-[auto_1fr]"
>
	{#if schedule}
		<UpcomingEntries
			class="min-w-0 group-data-wide/card:min-[1700px]:col-start-2"
			{conferenceId}
			{userId}
			{seat}
		/>
	{/if}
	<div
		class={[
			'grid min-w-0 grid-cols-1 items-start gap-x-12 gap-y-6 group-data-wide/card:min-[1700px]:col-start-1 group-data-wide/card:min-[1700px]:row-span-2 group-data-wide/card:min-[1700px]:row-start-1 group-data-wide/card:min-[1700px]:grid-cols-1',
			papers && schedule && 'xl:grid-cols-2'
		]}
	>
		{#if papers}
			<Section icon="file-text" title={m.userCardTabPapers()}>
				<PaperList {userId} {conferenceId} />
			</Section>
		{/if}
		{#if schedule}
			<Section icon="chart-pie" title={m.survey()}>
				<SurveyAnswers {conferenceId} {userId} />
			</Section>
		{/if}
	</div>
	{#if schedule}
		<div class="min-w-0 group-data-wide/card:min-[1700px]:col-start-2">
			<Section icon="calendar-dots" title={m.calendar()} subtitle={m.userCardCalendarHint()}>
				<PersonalCalendar {conferenceId} {userId} {seat} />
			</Section>
		</div>
	{/if}
</div>
