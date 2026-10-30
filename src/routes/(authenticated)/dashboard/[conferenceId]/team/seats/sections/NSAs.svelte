<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import SeatsIconHeader from '../SeatsIconHeader.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import type { UserPreview } from '../userPreview';
	import Flag from '#lib/components/Flag.svelte';
	import EmptySeatBtn from '../EmptySeatBtn.svelte';
	import SeatedMembers from '../SeatedMembers.svelte';
	import DelegationMembersMenu from '../DelegationMembersMenu.svelte';
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
				entryCode: true,
				members: {
					id: true,
					isHeadDelegate: true,
					school: { name: true },
					user: { id: true, givenName: true, familyName: true }
				}
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
	<SeatsIconHeader icon="fa-megaphone" membersMenu />
	<tbody>
		{#each nonStateActors as nsa (nsa.id)}
			{@const delegation = delegations.find((d) => d.assignedRoleId === nsa.id)}
			{@const members = delegation?.members ?? []}
			{@const seatLabel = `${nsa.abbreviation ?? ''} (${m.nonStateActors()})`}
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
						{#if delegation}
							<SeatedMembers {members} delegationId={delegation.id} {seatLabel} />
						{/if}
						<!-- a role nobody holds yet can always take someone -->
						{#if !delegation || members.length < (nsa.seatAmount ?? 0)}
							<EmptySeatBtn
								seat={{ delegationId: delegation?.id, roleId: nsa.id, seatLabel }}
								bind:user
								addParticipant={async () => await addParticipant(nsa.id)}
							/>
						{/if}
					</div>
				</td>
				<td>
					{members.length}
					{#if (nsa.seatAmount ?? 0) !== members.length}
						<span class="text-xs">/ {nsa.seatAmount} </span>
					{/if}
				</td>
				<td>
					<DelegationMembersMenu {delegation} showCommittee={false} />
				</td>
			</tr>
		{/each}
	</tbody>
</SeatsTableSection>
