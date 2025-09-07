<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { graphql, type getUserInfo$result, type SeatsQuery$result } from '$houdini';
	import InitialsButton from '../InitialsButton.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';
	import DownloadNSADataBtn from '../downloads/DownloadNSADataBtn.svelte';

	interface Props {
		nonStateActors: SeatsQuery$result['findManyNonStateActors'];
		delegations: SeatsQuery$result['findManyDelegations'];
		conferenceId: string;
	}

	let { nonStateActors, delegations, conferenceId }: Props = $props();

	const addNSAParticipantMutation = graphql(`
		mutation addNSAParticipant($userId: ID!, $conferenceId: ID!, $assignedNonStateActorId: ID!) {
			createOneAppliedDelegationMember(
				userId: $userId
				conferenceId: $conferenceId
				assignedNonStateActorId: $assignedNonStateActorId
			) {
				id
			}
		}
	`);

	let user = $state<Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined>(undefined);

	const addParticipant = async (nonStateActorId: string) => {
		if (!user?.id) return;
		await addNSAParticipantMutation.mutate({
			userId: user.id,
			conferenceId: conferenceId,
			assignedNonStateActorId: nonStateActorId
		});
	};
</script>

{#snippet downloadNSADataBtn()}
	<DownloadNSADataBtn {conferenceId} />
{/snippet}

<SeatsTableSection title={m.nsaSeats()} downloadButton={downloadNSADataBtn}>
	<thead>
		<tr>
			<td class="text-left">
				<i class="fa-duotone fa-megaphone"></i>
			</td>
			<td class="text-left">
				<i class="fa-duotone fa-users"></i>
			</td>
			<td>
				<i class="fa-duotone fa-sigma"></i>
			</td>
			<td>
				<i class="fa-duotone fa-users-viewfinder"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		{#each nonStateActors as nsa}
			{@const delegation = delegations.find((d) => d.assignedNonStateActor?.id === nsa.id)}
			<tr>
				<td>
					<div class="tooltip tooltip-right flex items-center gap-2" data-tip={nsa.name}>
						<Flag nsa icon={nsa.fontAwesomeIcon ?? ''} size="xs" />
						{nsa.abbreviation.toUpperCase()}
						<span class="hidden truncate text-left text-xs text-gray-400 lg:block">
							{nsa.name}
						</span>
					</div>
				</td>
				<td>
					<div class="flex gap-1">
						{#snippet addParticipantBtn()}
							<AddParticipantBtn
								bind:user
								targetRole={`${nsa.abbreviation} (${m.nonStateActors()})`}
								addParticipant={async () => await addParticipant(nsa.id)}
							/>
						{/snippet}
						{#if delegation}
							{#each delegation.members as member}
								<InitialsButton
									given_name={member.user.given_name}
									family_name={member.user.family_name}
									href={`/management/${conferenceId}/participants?selected=${member.user.id}`}
								/>
							{/each}
							{#if delegation.members.length < nsa.seatAmount}
								{@render addParticipantBtn()}
							{/if}
						{:else}
							{@render addParticipantBtn()}
						{/if}
					</div>
				</td>
				<td>
					{delegation?.members.length ?? 0}
					{#if nsa.seatAmount !== (delegation?.members.length ?? 0)}
						<span class="text-xs">/ {nsa.seatAmount} </span>
					{/if}
				</td>
				<td>
					{#if delegation}
						<a
							class="btn btn-ghost btn-sm"
							href={`/management/${conferenceId}/delegations?selected=${delegation?.id}`}
							aria-label="View delegation"
						>
							<i class="fa-duotone fa-up-right-from-square"></i>
						</a>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</SeatsTableSection>
