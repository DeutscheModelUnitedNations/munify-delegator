<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getLocale } from '$lib/paraglide/runtime';
	import Flag from '$lib/components/Flag.svelte';
	import {
		compareByStartDateDesc,
		delegationMemberEntry,
		singleParticipantEntry,
		supervisorEntry,
		teamMemberEntry,
		type HistoryEntry
	} from './historyEntries';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const conferenceSummary = {
		id: true,
		title: true,
		startConference: true,
		endConference: true
	} as const;

	/** Every other conference this person has been part of, in any role. */
	async function fetchHistory(userId: string, conferenceId: string) {
		const forUser = {
			where: { userId: { eq: userId }, conferenceId: { ne: conferenceId } }
		};

		const [delegationMembers, singleParticipants, supervisors, teamMembers] = await Promise.all([
			client.liveQuery.delegationMembers({
				__args: forUser,
				id: true,
				isHeadDelegate: true,
				conference: conferenceSummary,
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { name: true, fontAwesomeIcon: true }
				},
				assignedCommittee: { id: true, abbreviation: true }
			}),
			client.liveQuery.singleParticipants({
				__args: forUser,
				id: true,
				conference: conferenceSummary,
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.liveQuery.conferenceSupervisors({
				__args: forUser,
				id: true,
				conference: conferenceSummary
			}),
			client.liveQuery.teamMembers({
				__args: forUser,
				id: true,
				role: true,
				conference: conferenceSummary
			})
		]);

		return { delegationMembers, singleParticipants, supervisors, teamMembers };
	}

	const history = $derived(await fetchHistory(userId, conferenceId));

	const historyEntries = $derived(
		[
			...history.delegationMembers.map(delegationMemberEntry),
			...history.singleParticipants.map(singleParticipantEntry),
			...history.supervisors.map(supervisorEntry),
			...history.teamMembers.map(teamMemberEntry)
		].sort(compareByStartDateDesc)
	);

	const formatDateRange = (start: Date | null, end: Date | null) => {
		if (!start) return '';
		const locale = getLocale();
		if (!end) return start.toLocaleDateString(locale, { year: 'numeric', month: 'short' });
		return start.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
	};

	const roleColors: Record<HistoryEntry['roleType'], string> = {
		delegation: 'badge-primary',
		singleParticipant: 'badge-secondary',
		supervisor: 'badge-info',
		team: 'badge-warning'
	};
</script>

{#snippet entryIcon(entry: HistoryEntry)}
	{#if entry.flag?.type === 'nation'}
		<Flag alpha2Code={entry.flag.alpha2Code} size="xs" />
	{:else if entry.flag?.type === 'nsa'}
		<Flag nsa icon={entry.flag.fontAwesomeIcon} size="xs" />
	{:else}
		<div class="bg-base-300 flex h-6 w-8 items-center justify-center rounded-selector text-xs">
			<i class="fa-duotone {entry.icon} text-base-content/60"></i>
		</div>
	{/if}
{/snippet}

{#snippet historyCard(entry: HistoryEntry)}
	<div class="bg-base-200 rounded-box p-4">
		<div class="flex items-start gap-3">
			<!-- Flag or icon -->
			<div class="flex-shrink-0 mt-0.5">
				{@render entryIcon(entry)}
			</div>

			<!-- Content -->
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<div class="flex items-center justify-between gap-2">
					<span class="font-bold">{entry.conferenceTitle}</span>
					<div class="flex shrink-0 items-center gap-1">
						<span class="text-base-content/50 text-xs">
							{formatDateRange(entry.startDate, entry.endDate)}
						</span>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-1.5">
					<span class="badge badge-sm {roleColors[entry.roleType]}">
						{entry.roleLabel}
					</span>
					{#if entry.assignmentName}
						<span class="text-sm">{entry.assignmentName}</span>
					{/if}
					{#if entry.committeeName}
						<span class="text-base-content/50 text-sm">· {entry.committeeName}</span>
					{/if}
					{#if entry.isHeadDelegate}
						<span class="badge badge-accent badge-xs">
							<i class="fa-solid fa-medal"></i>
							{m.headDelegate()}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#if historyEntries.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-clock-rotate-left"></i>
		<span>{m.userCardNoHistory()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each historyEntries as entry (`${entry.roleType}:${entry.conferenceId}`)}
			{@render historyCard(entry)}
		{/each}
	</div>
{/if}
