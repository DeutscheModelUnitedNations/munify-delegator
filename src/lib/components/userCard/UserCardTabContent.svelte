<script lang="ts">
	import type { TeamroleEnum } from '#lib/api/rumbleClient/client';
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import type { overviewLead } from './formalities';
	import type { UserCardTab } from './userCardTabs';
	import OverviewTab from './tabs/OverviewTab.svelte';
	import PersonTab from './tabs/PersonTab.svelte';
	import RegistrationTab from './tabs/RegistrationTab.svelte';
	import FormalitiesTab from './tabs/FormalitiesTab.svelte';
	import OnSiteTab from './tabs/OnSiteTab.svelte';
	import PapersTab from './tabs/PapersTab.svelte';
	import HistoryTab from './tabs/HistoryTab.svelte';

	/** What one tab of the card shows, for the person's part in the conference. */
	interface Props {
		tab: UserCardTab;
		userId: string;
		conferenceId: string;
		lead: ReturnType<typeof overviewLead>;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		teamRole: TeamroleEnum | null | undefined;
		/** The committee and role ids the schedule's tracks are for */
		seat: Seat;
		/** The reader sees everything, so what is empty is missing (`readsWholePerson`) */
		wholePerson: boolean;
		/** Takes part in the conference, is on its team or waits for a seat */
		inConference: boolean;
		/** The person has a `conferenceParticipant` row */
		participant: boolean;
		/** The person follows the conference's schedule and answers its surveys */
		schedule: boolean;
		/** On the waiting list and not seated from it yet */
		waiting: boolean;
		onOpenTab: (tab: UserCardTab) => void;
	}

	let {
		tab,
		userId,
		conferenceId,
		lead,
		delegationId,
		singleParticipantId,
		supervisorId,
		teamRole,
		seat,
		wholePerson,
		inConference,
		participant,
		schedule,
		waiting,
		onOpenTab
	}: Props = $props();
</script>

{#if tab === 'overview'}
	<OverviewTab
		{userId}
		{conferenceId}
		{lead}
		{delegationId}
		{singleParticipantId}
		{supervisorId}
		{teamRole}
		{seat}
		{schedule}
		{onOpenTab}
	/>
{:else if tab === 'person'}
	<PersonTab {userId} {conferenceId} {wholePerson} />
{:else if tab === 'registration'}
	<RegistrationTab
		{userId}
		{conferenceId}
		{delegationId}
		{singleParticipantId}
		{supervisorId}
		{teamRole}
		{waiting}
	/>
{:else if tab === 'formalities'}
	<FormalitiesTab {userId} {conferenceId} isConferenceSupervisor={!!supervisorId} />
{:else if tab === 'onSite'}
	<OnSiteTab {userId} {conferenceId} {seat} {participant} schedule={teamRole === undefined} />
{:else if tab === 'papers'}
	<PapersTab {userId} {conferenceId} />
{:else if tab === 'history'}
	<HistoryTab {userId} {conferenceId} emails={inConference} />
{/if}
