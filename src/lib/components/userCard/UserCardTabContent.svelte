<script lang="ts">
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import type { UserCardTab } from './userCardTabs';
	import RegistrationTab from './tabs/RegistrationTab.svelte';
	import FormalitiesTab from './tabs/FormalitiesTab.svelte';
	import ProgramTab from './tabs/ProgramTab.svelte';
	import HistoryTab from './tabs/HistoryTab.svelte';

	/** What one tab of the card shows, for the person's part in the conference. */
	interface Props {
		tab: UserCardTab;
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		/** The committee and role ids the schedule's tracks are for */
		seat: Seat;
		/** Takes part in the conference, is on its team or waits for a seat */
		inConference: boolean;
		/** A confirmed place at the conference */
		access: boolean;
		/** The conference runs or is over */
		onSite: boolean;
		/** The person follows the conference's schedule and answers its surveys */
		schedule: boolean;
		/** Wrote papers, or is in a delegation that does */
		papers: boolean;
		/** On the waiting list and not seated from it yet */
		waiting: boolean;
		/** The conference is still in the time of applications */
		applying: boolean;
	}

	let {
		tab,
		userId,
		conferenceId,
		delegationId,
		singleParticipantId,
		supervisorId,
		seat,
		inConference,
		access,
		onSite,
		schedule,
		papers,
		waiting,
		applying
	}: Props = $props();
</script>

{#if tab === 'registration'}
	<RegistrationTab
		{userId}
		{conferenceId}
		{delegationId}
		{singleParticipantId}
		{supervisorId}
		{waiting}
		{applying}
	/>
{:else if tab === 'formalities'}
	<FormalitiesTab
		{userId}
		{conferenceId}
		isConferenceSupervisor={!!supervisorId}
		{access}
		{onSite}
	/>
{:else if tab === 'program'}
	<ProgramTab {userId} {conferenceId} {seat} {schedule} {papers} />
{:else if tab === 'history'}
	<HistoryTab {userId} {conferenceId} emails={inConference} />
{/if}
