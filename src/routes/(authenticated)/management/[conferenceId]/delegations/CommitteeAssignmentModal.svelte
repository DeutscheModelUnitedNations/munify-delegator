<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql, type DelegationDrawerQuery$result } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { toast } from 'svelte-sonner';
	import type { GetCommitteeDataForCommitteeAssignmentVariables } from './$houdini';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	interface Props {
		open: boolean;
		members?: NonNullable<DelegationDrawerQuery$result['findUniqueDelegation']>['members'];
		nation?: NonNullable<DelegationDrawerQuery$result['findUniqueDelegation']>['assignedNation'];
		conferenceId: string;
	}

	let { open = $bindable(false), members: unsortedMembers, nation, conferenceId }: Props = $props();

	const CommitteeDataQuery = graphql(`
		query GetCommitteeDataForCommitteeAssignment($conferenceId: String!) {
			findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
				id
				abbreviation
				nations {
					alpha2Code
					alpha3Code
				}
				numOfSeatsPerDelegation
			}
		}
	`);

	$effect(() => {
		CommitteeDataQuery.fetch({ variables: { conferenceId } });
	});

	let filteredCommittees = $derived(
		$CommitteeDataQuery.data
			? $CommitteeDataQuery.data.findManyCommittees?.filter((c) =>
					c.nations.map((n) => n.alpha3Code).includes(nation?.alpha3Code ?? '')
				)
			: []
	);

	let members = $derived(
		unsortedMembers?.sort((a, b) =>
			(a.user.family_name + a.user.given_name).localeCompare(a.user.family_name + a.user.given_name)
		)
	);

	const updateDelegationMemberAssignedCommittee = graphql(`
		mutation UpdateDelegationMemberAssignedCommittee(
			$delegationMemberId: String!
			$committeeId: ID!
		) {
			updateOneDelegationMemberCommittee(
				where: { id: $delegationMemberId }
				data: { assignedCommitteeId: $committeeId }
			) {
				id
			}
		}
	`);

	const resetCommitteeAssignmentForAllDelegationMembers = graphql(`
		mutation ResetCommitteeAssignmentForAllDelegationMembers($delegationMemberIds: [String!]) {
			updateManyDelegationMemberCommittee(where: { id: { in: $delegationMemberIds } }, data: {}) {
				count
			}
		}
	`);

	let loading = $state(false);
</script>

{#snippet action()}
	<button
		class="btn btn-error"
		onclick={async () => {
			if (!members) return;
			loading = true;
			try {
				await toast.promise(
					resetCommitteeAssignmentForAllDelegationMembers.mutate({
						delegationMemberIds: members.map((m) => m.id)
					}),
					genericPromiseToastMessages
				);

				cache.markStale();
				await invalidateAll();
			} finally {
				loading = false;
			}
		}}
	>
		<i class="fas fa-trash-undo"></i>
		{m.reset()}
	</button>
	<button class="btn btn-primary" onclick={() => (open = false)}>
		<i class="fas fa-check"></i>
		{m.done()}
	</button>
{/snippet}

<Modal bind:open title={m.committeeAssignment()} {action} fullWidth>
	{#if $CommitteeDataQuery.fetching}
		<div class="w-full items-center justify-center">
			<i class="fa-duotone fa-spin fa-spinner"></i>
		</div>
	{:else if !members || members.length === 0}
		<!-- <p>{m.noMembers()}</p> -->
	{:else if !filteredCommittees || filteredCommittees.length === 0}
		<!-- <p>{m.noCommittees()}</p> -->
	{:else}
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					{#each filteredCommittees as committee}
						<th>{committee.abbreviation}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each members as member}
					<tr>
						<td>
							{formatNames(member.user.given_name, member.user.family_name)}
						</td>
						{#each filteredCommittees as committee}
							{@const active = member.assignedCommittee?.id === committee.id}
							<td>
								<button
									class="btn btn-square btn-sm {active ? 'btn-success' : ''} {loading &&
										'disabled'}"
									onclick={async () => {
										loading = true;
										try {
											await toast.promise(
												updateDelegationMemberAssignedCommittee.mutate({
													committeeId: committee.id,
													delegationMemberId: member.id
												}),
												genericPromiseToastMessages
											);

											cache.markStale();
											await invalidateAll();
										} finally {
											loading = false;
										}
									}}
								>
									{#if loading}
										<i class="fa-duotone fa-spin fa-spinner"></i>
									{:else if active}
										<i class="fa-duotone fa-check"></i>
									{:else}
										<i class="fa-duotone fa-plus"></i>
									{/if}
								</button>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Modal>
