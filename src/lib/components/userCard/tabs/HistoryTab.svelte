<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getLocale } from '$lib/paraglide/runtime';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { translateTeamRole } from '$lib/utils/enumTranslations';

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

	/** Every conference this person has ever been part of, in any role. */
	async function fetchHistory() {
		const forUser = { where: { userId: { eq: userId } } };

		const [delegationMembers, singleParticipants, supervisors, teamMembers] = await Promise.all([
			client.query.delegationMembers({
				__args: forUser,
				id: true,
				isHeadDelegate: true,
				conference: conferenceSummary,
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: {
						name: true,
						abbreviation: true,
						fontAwesomeIcon: true
					}
				},
				assignedCommittee: { id: true, abbreviation: true, name: true }
			}),
			client.query.singleParticipants({
				__args: forUser,
				id: true,
				conference: conferenceSummary,
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.query.conferenceSupervisors({
				__args: forUser,
				id: true,
				conference: conferenceSummary
			}),
			client.query.teamMembers({
				__args: forUser,
				id: true,
				role: true,
				conference: conferenceSummary
			})
		]);

		return { delegationMembers, singleParticipants, supervisors, teamMembers };
	}

	let history = $state<Awaited<ReturnType<typeof fetchHistory>>>();
	let historyLoading = $state(false);

	$effect(() => {
		historyLoading = true;
		void fetchHistory()
			.then((result) => {
				history = result;
			})
			.finally(() => {
				historyLoading = false;
			});
	});

	interface HistoryEntry {
		conferenceId: string;
		conferenceTitle: string;
		startDate: Date | null;
		endDate: Date | null;
		roleType: 'delegation' | 'singleParticipant' | 'supervisor' | 'team';
		roleLabel: string;
		icon: string;
		flag?: { type: 'nation'; alpha2Code: string } | { type: 'nsa'; fontAwesomeIcon: string };
		assignmentName?: string;
		committeeName?: string;
		isHeadDelegate?: boolean;
	}

	const historyEntries = $derived.by(() => {
		const entries: HistoryEntry[] = [];

		for (const dm of history?.delegationMembers ?? []) {
			if (dm.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: dm.conference.id,
				conferenceTitle: dm.conference.title,
				startDate: dm.conference.startConference ?? null,
				endDate: dm.conference.endConference ?? null,
				roleType: 'delegation',
				roleLabel: m.delegationMember(),
				icon: 'fa-users',
				flag: dm.delegation?.assignedNation
					? { type: 'nation', alpha2Code: dm.delegation.assignedNation.alpha2Code }
					: dm.delegation?.assignedNonStateActor
						? {
								type: 'nsa',
								fontAwesomeIcon:
									dm.delegation.assignedNonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'
							}
						: undefined,
				assignmentName: dm.delegation?.assignedNation?.alpha3Code
					? getFullTranslatedCountryNameFromISO3Code(dm.delegation.assignedNation.alpha3Code)
					: dm.delegation?.assignedNonStateActor?.name,
				committeeName: dm.assignedCommittee?.abbreviation,
				isHeadDelegate: dm.isHeadDelegate
			});
		}

		for (const sp of history?.singleParticipants ?? []) {
			if (sp.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: sp.conference.id,
				conferenceTitle: sp.conference.title,
				startDate: sp.conference.startConference ?? null,
				endDate: sp.conference.endConference ?? null,
				roleType: 'singleParticipant',
				roleLabel: m.singleParticipant(),
				icon: 'fa-user',
				flag: sp.assignedRole?.fontAwesomeIcon
					? { type: 'nsa', fontAwesomeIcon: sp.assignedRole.fontAwesomeIcon }
					: undefined,
				assignmentName: sp.assignedRole?.name
			});
		}

		for (const sup of history?.supervisors ?? []) {
			if (sup.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: sup.conference.id,
				conferenceTitle: sup.conference.title,
				startDate: sup.conference.startConference ?? null,
				endDate: sup.conference.endConference ?? null,
				roleType: 'supervisor',
				roleLabel: m.supervisor(),
				icon: 'fa-chalkboard-user'
			});
		}

		for (const tm of history?.teamMembers ?? []) {
			if (tm.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: tm.conference.id,
				conferenceTitle: tm.conference.title,
				startDate: tm.conference.startConference ?? null,
				endDate: tm.conference.endConference ?? null,
				roleType: 'team',
				roleLabel: m.teamMember(),
				icon: 'fa-shield-halved',
				assignmentName: tm.role ? translateTeamRole(tm.role) : undefined
			});
		}

		return entries.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
	});

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

{#if historyLoading}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-24 w-full"></div>
		<div class="skeleton h-24 w-full"></div>
	</div>
{:else if historyEntries.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-clock-rotate-left"></i>
		<span>{m.userCardNoHistory()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each historyEntries as entry}
			<div class="bg-base-200 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<!-- Flag or icon -->
					<div class="flex-shrink-0 mt-0.5">
						{#if entry.flag?.type === 'nation'}
							<Flag alpha2Code={entry.flag.alpha2Code} size="xs" />
						{:else if entry.flag?.type === 'nsa'}
							<Flag nsa icon={entry.flag.fontAwesomeIcon} size="xs" />
						{:else}
							<div class="bg-base-300 flex h-6 w-8 items-center justify-center rounded text-xs">
								<i class="fa-duotone {entry.icon} text-base-content/60"></i>
							</div>
						{/if}
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
		{/each}
	</div>
{/if}
