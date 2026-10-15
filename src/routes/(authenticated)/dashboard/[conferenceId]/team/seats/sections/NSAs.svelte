<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import SeatsIconHeader from '../SeatsIconHeader.svelte';
	import { client, type UserPreview } from '$lib/api/rumbleClient/client';
	import InitialsButton from '../InitialsButton.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';
	import DownloadNSADataBtn from '../downloads/DownloadNSADataBtn.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// In one derived, so neither waits on the other.
	const [nonStateActors, delegations] = $derived(
		await Promise.all([
			client.liveQuery.conferenceRoles({
				__args: {
					where: { conferenceId: { eq: conferenceId }, kind: 'NON_STATE_ACTOR' }
				},
				id: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.liveQuery.delegations({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						assignedRole: { kind: 'NON_STATE_ACTOR' }
					}
				},
				id: true,
				assignedRoleId: true,
				members: { id: true, user: { id: true, givenName: true, familyName: true } }
			})
		])
	);

	let user = $state<Partial<UserPreview> | undefined>(undefined);

	const addParticipant = async (roleId: string) => {
		if (!user?.id) return;
		await client.mutate.createAppliedDelegationMember({
			__args: {
				userId: user.id,
				conferenceId,
				assignedRoleId: roleId
			},
			id: true
		});
	};
</script>

{#snippet downloadNSADataBtn()}
	<DownloadNSADataBtn {conferenceId} />
{/snippet}

<SeatsTableSection title={m.nsaSeats()} downloadButton={downloadNSADataBtn}>
	<SeatsIconHeader icon="fa-megaphone" />
	<tbody>
		{#each nonStateActors as nsa (nsa.id)}
			{@const delegation = delegations.find((d) => d.assignedRoleId === nsa.id)}
			<tr>
				<td>
					<div class="tooltip tooltip-right flex items-center gap-2" data-tip={nsa.name}>
						<Flag nsa icon={nsa.fontAwesomeIcon ?? ''} size="xs" />
						{(nsa.abbreviation ?? '').toUpperCase()}
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
								targetRole={`${nsa.abbreviation ?? ''} (${m.nonStateActors()})`}
								addParticipant={async () => await addParticipant(nsa.id)}
							/>
						{/snippet}
						{#if delegation}
							{#each delegation.members as member (member.id)}
								<InitialsButton
									given_name={member.user.givenName}
									family_name={member.user.familyName}
									userId={member.user.id}
								/>
							{/each}
							{#if delegation.members.length < (nsa.seatAmount ?? 0)}
								{@render addParticipantBtn()}
							{/if}
						{:else}
							{@render addParticipantBtn()}
						{/if}
					</div>
				</td>
				<td>
					{delegation?.members.length ?? 0}
					{#if (nsa.seatAmount ?? 0) !== (delegation?.members.length ?? 0)}
						<span class="text-xs">/ {nsa.seatAmount} </span>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</SeatsTableSection>
