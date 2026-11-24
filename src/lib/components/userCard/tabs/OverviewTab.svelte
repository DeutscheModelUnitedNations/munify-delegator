<script lang="ts">
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import type { TeamroleEnum } from '#lib/api/rumbleClient/client';
	import type { Seat } from '#lib/components/calendar/calendarNow';
	import { canManageEmails } from '#lib/helpers/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import OverviewApplication from '../overview/OverviewApplication.svelte';
	import OverviewCalendar from '../overview/OverviewCalendar.svelte';
	import OverviewDelegation from '../overview/OverviewDelegation.svelte';
	import OverviewEmails from '../overview/OverviewEmails.svelte';
	import OverviewFormalities from '../overview/OverviewFormalities.svelte';
	import OverviewOnSite from '../overview/OverviewOnSite.svelte';
	import OverviewPapers from '../overview/OverviewPapers.svelte';
	import OverviewStudents from '../overview/OverviewStudents.svelte';
	import OverviewSurveys from '../overview/OverviewSurveys.svelte';
	import OverviewTile from '../overview/OverviewTile.svelte';
	import type { overviewLead } from '../formalities';
	import type { UserCardTab } from '../userCardTabs';

	/**
	 * What there is to do with the person in this phase of the conference, and everything else about
	 * their part in short. What is changed often is changed here; the rest has its tab.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		lead: ReturnType<typeof overviewLead>;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		teamRole: TeamroleEnum | null | undefined;
		/** The committee and role ids the schedule's tracks are for */
		seat: Seat;
		/** The person follows the conference's schedule and answers its surveys */
		schedule: boolean;
		onOpenTab: (tab: UserCardTab) => void;
	}

	let {
		userId,
		conferenceId,
		lead,
		delegationId,
		singleParticipantId,
		supervisorId,
		teamRole,
		seat,
		schedule,
		onOpenTab
	}: Props = $props();

	const mayReadEmails = $derived(canManageEmails(await fetchTeamAccess(conferenceId)));
	const isConferenceSupervisor = $derived(!!supervisorId);
</script>

<div class="flex flex-col gap-3">
	{#if lead === 'formalities'}
		<OverviewFormalities {userId} {conferenceId} {isConferenceSupervisor} />
	{:else if lead === 'onSite'}
		<OverviewOnSite {userId} {conferenceId} />
	{/if}

	<!-- Columns rather than a grid, so short tiles leave no holes beside long ones -->
	<div class="gap-3 xl:columns-2 [&>section]:mb-3 [&>section]:break-inside-avoid">
		{#if lead === 'application'}
			<OverviewTile
				title={m.userCardTabRegistration()}
				icon="note-pencil"
				onopen={() => onOpenTab('registration')}
			>
				<OverviewApplication {userId} {conferenceId} {delegationId} {singleParticipantId} />
			</OverviewTile>
		{/if}
		{#if delegationId}
			<OverviewTile title={m.delegation()} icon="users" onopen={() => onOpenTab('registration')}>
				<OverviewDelegation {delegationId} {userId} />
			</OverviewTile>
		{/if}
		{#if supervisorId}
			<OverviewTile
				title={m.userCardTabStudents()}
				icon="users"
				onopen={() => onOpenTab('registration')}
			>
				<OverviewStudents {supervisorId} />
			</OverviewTile>
		{/if}
		{#if teamRole !== undefined}
			<OverviewTile title={m.teamMember()} icon="users-three">
				<p>{teamRole ? translateTeamRole(teamRole) : 'N/A'}</p>
			</OverviewTile>
		{/if}
		{#if schedule}
			<OverviewTile
				title={m.userCardNextEntries()}
				icon="calendar-dots"
				onopen={() => onOpenTab('onSite')}
			>
				<OverviewCalendar {userId} {conferenceId} {seat} />
			</OverviewTile>
			<OverviewTile title={m.survey()} icon="chart-pie" onopen={() => onOpenTab('onSite')}>
				<OverviewSurveys {userId} {conferenceId} />
			</OverviewTile>
		{/if}
		{#if delegationId && schedule}
			<OverviewTile
				title={m.userCardTabPapers()}
				icon="file-text"
				onopen={() => onOpenTab('papers')}
			>
				<OverviewPapers {userId} {conferenceId} />
			</OverviewTile>
		{/if}
		{#if mayReadEmails}
			<OverviewTile
				title={m.userCardLastEmails()}
				icon="envelope"
				onopen={() => onOpenTab('history')}
			>
				<OverviewEmails {userId} {conferenceId} />
			</OverviewTile>
		{/if}
	</div>
</div>
