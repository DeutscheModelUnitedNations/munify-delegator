<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import Flag from '#lib/components/Flag.svelte';
	import formatNames from '#lib/helpers/formatNames';
	import {
		compareByStartDateDesc,
		delegationMemberEntry,
		linkedAttendanceEntry,
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
	async function fetchHistory({ userId, conferenceId }: { userId: string; conferenceId: string }) {
		const forUser = {
			where: { userId: { eq: userId }, conferenceId: { ne: conferenceId } }
		};
		// Registrations reach the user and the conference through their participant row.
		const registrationOfUser = {
			where: { user: { id: { eq: userId } }, conference: { id: { ne: conferenceId } } }
		};

		const confirmed = { where: { status: 'CONFIRMED' as const } };
		const account = { givenName: true, familyName: true } as const;
		const attendance = {
			conferenceId: true,
			title: true,
			startConference: true,
			role: true
		} as const;

		const [delegationMembers, singleParticipants, supervisors, teamMembers, user] =
			await Promise.all([
				client.liveQuery.delegationMembers({
					__args: registrationOfUser,
					id: true,
					isHeadDelegate: true,
					conference: conferenceSummary,
					delegation: {
						id: true,
						assignedRole: {
							kind: true,
							name: true,
							icon: true,
							nation: { alpha2Code: true, alpha3Code: true }
						}
					},
					assignedCommittee: { id: true, abbreviation: true }
				}),
				client.liveQuery.singleParticipants({
					__args: registrationOfUser,
					id: true,
					conference: conferenceSummary,
					assignedRole: { id: true, name: true, icon: true }
				}),
				client.liveQuery.conferenceSupervisors({
					__args: registrationOfUser,
					id: true,
					conference: conferenceSummary
				}),
				client.liveQuery.teamMembers({
					__args: forUser,
					id: true,
					role: true,
					conference: conferenceSummary
				}),
				// The accounts confirmed to be the same person, all of them (`sameLinks.ts`), with the
				// conferences they took part in. Only the care team reads the pairs; for others, none.
				client.liveQuery.user({
					__args: { id: userId },
					duplicatesAsUser: {
						__args: confirmed,
						candidateId: true,
						candidate: account,
						candidateAttendances: attendance
					},
					duplicatesAsCandidate: {
						__args: confirmed,
						userId: true,
						user: account,
						userAttendances: attendance
					}
				})
			]);

		const linked = [
			...user.duplicatesAsUser.map((pair) => ({
				id: pair.candidateId,
				account: pair.candidate,
				attendances: pair.candidateAttendances
			})),
			...user.duplicatesAsCandidate.map((pair) => ({
				id: pair.userId,
				account: pair.user,
				attendances: pair.userAttendances
			}))
		];
		const linkedAttendances = linked.flatMap(({ id, account, attendances }) =>
			attendances
				.filter((attendance) => attendance.conferenceId !== conferenceId)
				.map((attendance) => ({
					attendance,
					account: {
						id,
						name: formatNames({ givenName: account.givenName, familyName: account.familyName })
					}
				}))
		);

		return { delegationMembers, singleParticipants, supervisors, teamMembers, linkedAttendances };
	}

	const history = $derived(await fetchHistory({ userId, conferenceId }));

	const historyEntries = $derived(
		[
			...history.delegationMembers.map(delegationMemberEntry),
			...history.singleParticipants.map(singleParticipantEntry),
			...history.supervisors.map(supervisorEntry),
			...history.teamMembers.map(teamMemberEntry),
			...history.linkedAttendances.map(linkedAttendanceEntry)
		].sort(compareByStartDateDesc)
	);

	const formatDateRange = ({ start, end }: { start: Date | null; end: Date | null }) => {
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
		<Flag nsa icon={entry.flag.icon} size="xs" />
	{:else}
		<div class="bg-base-300 flex h-6 w-8 items-center justify-center rounded-field text-xs">
			<i aria-hidden="true" class="ph-duotone {entry.icon} text-base-content/60"></i>
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
					<!-- The same person's card in that conference, where their role there is shown -->
					<a
						class="link link-hover font-bold"
						href={resolve('/(authenticated)/dashboard/[conferenceId]/team/user/[userId]', {
							conferenceId: entry.conferenceId,
							userId: entry.linkedAccount?.id ?? userId
						})}
						title={m.openUserCardInConference({ conference: entry.conferenceTitle })}
					>
						{entry.conferenceTitle}
						<i aria-hidden="true" class="ph-duotone ph-arrow-square-out text-xs"></i>
					</a>
					<div class="flex shrink-0 items-center gap-1">
						<span class="text-base-content/50 text-xs">
							{formatDateRange({ start: entry.startDate, end: entry.endDate })}
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
					{#if entry.linkedAccount}
						<span
							class="badge badge-error badge-soft badge-sm gap-1"
							title={m.possibleDuplicateConfirmedBadge()}
						>
							<i aria-hidden="true" class="ph-duotone ph-link"></i>
							{m.userCardLinkedHistoryAccount({ name: entry.linkedAccount.name })}
						</span>
					{/if}
					{#if entry.isHeadDelegate}
						<span class="badge badge-accent badge-xs">
							<i aria-hidden="true" class="ph-duotone ph-medal"></i>
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
		<i aria-hidden="true" class="ph-duotone ph-clock-counter-clockwise"></i>
		<span>{m.userCardNoHistory()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each historyEntries as entry (`${entry.linkedAccount?.id ?? userId}:${entry.roleType}:${entry.conferenceId}`)}
			{@render historyCard(entry)}
		{/each}
	</div>
{/if}
