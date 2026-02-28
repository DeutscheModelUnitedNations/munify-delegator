<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { getLocale } from '$lib/paraglide/runtime';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const historyQuery = graphql(`
		query UserCardHistoryQuery($userId: String!) {
			findManyDelegationMembers(where: { userId: { equals: $userId } }) {
				id
				isHeadDelegate
				conference {
					id
					title
					startConference
					endConference
				}
				delegation {
					id
					assignedNation {
						alpha3Code
					}
					assignedNonStateActor {
						abbreviation
					}
				}
				assignedCommittee {
					id
					abbreviation
				}
			}
			findManySingleParticipants(where: { userId: { equals: $userId } }) {
				id
				conference {
					id
					title
					startConference
					endConference
				}
				assignedRole {
					id
					name
				}
			}
			findManyConferenceSupervisors(where: { userId: { equals: $userId } }) {
				id
				conference {
					id
					title
					startConference
					endConference
				}
			}
			findManyTeamMembers(where: { userId: { equals: $userId } }) {
				id
				role
				conference {
					id
					title
					startConference
					endConference
				}
			}
		}
	`);

	$effect(() => {
		historyQuery.fetch({ variables: { userId } });
	});

	interface HistoryEntry {
		conferenceId: string;
		conferenceTitle: string;
		startDate: string;
		roleType: string;
		details: string[];
	}

	const historyEntries = $derived.by(() => {
		const entries: HistoryEntry[] = [];

		for (const dm of $historyQuery.data?.findManyDelegationMembers ?? []) {
			if (dm.conference.id === conferenceId) continue;
			const details: string[] = [];
			if (dm.delegation?.assignedNation?.alpha3Code)
				details.push(dm.delegation.assignedNation.alpha3Code);
			else if (dm.delegation?.assignedNonStateActor?.abbreviation)
				details.push(dm.delegation.assignedNonStateActor.abbreviation);
			if (dm.assignedCommittee?.abbreviation) details.push(dm.assignedCommittee.abbreviation);
			if (dm.isHeadDelegate) details.push(m.headDelegate());
			entries.push({
				conferenceId: dm.conference.id,
				conferenceTitle: dm.conference.title,
				startDate: dm.conference.startConference ?? '',
				roleType: m.delegationMember(),
				details
			});
		}

		for (const sp of $historyQuery.data?.findManySingleParticipants ?? []) {
			if (sp.conference.id === conferenceId) continue;
			const details: string[] = [];
			if (sp.assignedRole?.name) details.push(sp.assignedRole.name);
			entries.push({
				conferenceId: sp.conference.id,
				conferenceTitle: sp.conference.title,
				startDate: sp.conference.startConference ?? '',
				roleType: m.singleParticipant(),
				details
			});
		}

		for (const sup of $historyQuery.data?.findManyConferenceSupervisors ?? []) {
			if (sup.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: sup.conference.id,
				conferenceTitle: sup.conference.title,
				startDate: sup.conference.startConference ?? '',
				roleType: m.supervisor(),
				details: []
			});
		}

		for (const tm of $historyQuery.data?.findManyTeamMembers ?? []) {
			if (tm.conference.id === conferenceId) continue;
			entries.push({
				conferenceId: tm.conference.id,
				conferenceTitle: tm.conference.title,
				startDate: tm.conference.startConference ?? '',
				roleType: m.teamMember(),
				details: tm.role ? [tm.role] : []
			});
		}

		return entries.sort(
			(a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
		);
	});
</script>

{#if $historyQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-16 w-full"></div>
		<div class="skeleton h-16 w-full"></div>
	</div>
{:else if historyEntries.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-clock-rotate-left"></i>
		<span>{m.userCardNoHistory()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each historyEntries as entry}
			<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
				<div>
					<span class="font-bold">{entry.conferenceTitle}</span>
					<span class="text-base-content/60 ml-2 text-sm">
						{new Date(entry.startDate).toLocaleDateString(getLocale())}
					</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="badge badge-sm">{entry.roleType}</span>
					{#if entry.details.length > 0}
						<span class="text-base-content/60">{entry.details.join(' · ')}</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
