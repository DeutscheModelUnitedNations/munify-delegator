<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import type { PageData } from './$houdini';
	import formatNames from '$lib/services/formatNames';

	let { data }: { data: PageData } = $props();
	let assignmentData = $derived(data.DelegationAssignmentDataQuery);
	let members = $derived($assignmentData.data?.findUniqueDelegationMember?.delegation.members);
	let delegation = $derived($assignmentData.data?.findUniqueDelegationMember?.delegation);
	let committees = $derived(
		$assignmentData.data?.findManyCommittees.filter((c) =>
			c.nations.some((n) => n.alpha3Code === delegation?.assignedNation?.alpha3Code)
		)
	);

	let membersWithCommittees = $state<
		{
			delegationMemberId: string;
			committeeId: string | null;
		}[]
	>([]);

	$effect(() => {
		if (members && committees) {
			membersWithCommittees = members.map((member) => {
				return {
					delegationMemberId: member.id,
					committeeId: null
				};
			});
		}
	});

	const assignCommitteeMutation = graphql(`
		mutation assignCommitteesToDelegationMembers(
			$data: [updateManyDelegationMemberInputTypeArrayValue!]!
		) {
			assignCommitteesToDelegationMembers(assignments: $data) {
				id
				assignedCommittee {
					id
				}
			}
		}
	`);

	const sendCommitteeAssignment = async () => {
		if (membersWithCommittees.some((x) => !x.committeeId)) {
			alert(m.pleaseAssignAllMembers());
			return;
		}

		if (membersWithCommittees.some((x) => !x.delegationMemberId || !x.committeeId)) {
			alert(m.failedToAssignCommittees());
			throw new Error('Failed to assign committees');
		}

		const req = await assignCommitteeMutation.mutate({
			data: membersWithCommittees as {
				delegationMemberId: string;
				committeeId: string;
			}[]
		});
		if (!req.data?.assignCommitteesToDelegationMembers) {
			alert(m.failedToAssignCommittees());
			throw new Error('Failed to assign committees');
		}
		invalidateAll();
	};
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-4">
		<a class="btn btn-square" aria-label="Back" href=".">
			<i class="fa-duotone fa-arrow-left text-xl"></i>
		</a>
		<h1 class="text-2xl font-bold">{m.committeeAssignment()}</h1>
	</div>

	{#if members?.some((member) => !!member.assignedCommittee)}
		<div class="alert alert-success">
			<i class="fas fa-check-circle text-3xl"></i>
			<div class="flex flex-col">
				<h3 class="text-xl font-bold">{m.committeesSucessfullyAssigned()}</h3>
			</div>
		</div>
	{/if}

	<section class="flex flex-col gap-4">
		<h3 class="font-bold">{m.theFollowingCommitteesAreAssignable()}:</h3>
		<div class="flex flex-col gap-1">
			{#each committees ?? [] as committee}
				<div class="badge badge-primary badge-lg">
					<span class="font-bold">{committee.abbreviation}</span
					>&emsp;{committee.name}&emsp;({committee.numOfSeatsPerDelegation}
					{committee.numOfSeatsPerDelegation > 1 ? m.seats() : m.seat()})
				</div>
			{/each}
		</div>

		<table class="table-lg table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					<th>{m.committee()}</th>
				</tr>
			</thead>
			<tbody>
				{#each membersWithCommittees ?? [] as memberWithCommittee}
					{@const member = members?.find((me) => me.id === memberWithCommittee.delegationMemberId)}
					<tr>
						<td>{formatNames(member?.user.given_name, member?.user.family_name)}</td>
						<td>
							<select class="select" bind:value={memberWithCommittee.committeeId}>
								<option value="" selected>{m.pleaseSelect()}</option>
								{#each committees ?? [] as committee}
									<option
										value={committee.id}
										disabled={membersWithCommittees.some(
											(x) =>
												x.delegationMemberId !== member?.id &&
												committee.numOfSeatsPerDelegation <=
													membersWithCommittees.filter((y) => y.committeeId === committee.id).length
										)}
									>
										{committee.abbreviation}
									</option>
								{/each}
							</select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if $assignmentData.data?.findUniqueDelegationMember?.isHeadDelegate}
			<button
				class="btn btn-primary"
				disabled={membersWithCommittees.some((x) => !x.committeeId)}
				onclick={sendCommitteeAssignment}>{m.save()}</button
			>
		{:else}
			<div class="alert alert-warning">
				<i class="fas fa-exclamation-triangle text-3xl"></i>
				<div class="flex flex-col">
					<h3 class="text-xl font-bold">{m.onlyHeadDelegateCanAssignCommittees()}</h3>
				</div>
			</div>
		{/if}
	</section>
</div>
