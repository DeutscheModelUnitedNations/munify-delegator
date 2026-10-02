<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { fetchCommitteeAssignment } from './committeeAssignment';
	import formatNames from '$lib/helpers/formatNames';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = $derived(await getCurrentUser());

	const assignment = $derived(await fetchCommitteeAssignment(params.conferenceId, currentUser.sub));
	const delegationMember = $derived(assignment.delegationMember);
	let members = $derived(delegationMember?.delegation.members);
	let delegation = $derived(delegationMember?.delegation);
	let committees = $derived(
		assignment.committees.filter((c) =>
			c.nations.some((n) => n.alpha3Code === delegation?.assignedNation?.alpha3Code)
		)
	);

	let membersWithCommittees = $state<
		{
			delegationMemberId: string;
			committeeId: string | null;
			alreadyAssigned: boolean;
		}[]
	>([]);

	$effect(() => {
		if (members && committees) {
			membersWithCommittees = members.map((member) => {
				return {
					delegationMemberId: member.id,
					committeeId: member.assignedCommittee?.id ?? null,
					alreadyAssigned: !!member.assignedCommittee
				};
			});
		}
	});

	type MemberWithCommittee = (typeof membersWithCommittees)[number];
	type Committee = (typeof committees)[number];

	const unassignedMembers = $derived(membersWithCommittees.filter((x) => !x.alreadyAssigned));

	/** Whether every seat of `committee` is taken, so it cannot be picked for another member. */
	const isCommitteeFull = (committee: Committee, memberId: string | undefined) =>
		membersWithCommittees.some(
			(x) =>
				x.delegationMemberId !== memberId &&
				committee.numOfSeatsPerDelegation <=
					membersWithCommittees.filter((y) => y.committeeId === committee.id).length
		);

	const sendCommitteeAssignment = async () => {
		// Only validate unassigned members - already assigned ones are locked
		if (unassignedMembers.some((x) => !x.committeeId)) {
			alert(m.pleaseAssignAllMembers());
			return;
		}

		if (unassignedMembers.some((x) => !x.delegationMemberId || !x.committeeId)) {
			alert(m.failedToAssignCommittees());
			throw new Error('Failed to assign committees');
		}

		// Only send unassigned members to the mutation
		const assigned = await client.mutate.assignCommitteesToDelegationMembers({
			__args: {
				conferenceId: params.conferenceId ?? '',
				assignments: unassignedMembers.map((member) => ({
					delegationMemberId: member.delegationMemberId,
					committeeId: member.committeeId ?? ''
				}))
			},
			id: true,
			assignedCommittee: { id: true }
		});
		if (assigned.length === 0) {
			alert(m.failedToAssignCommittees());
			throw new Error('Failed to assign committees');
		}
	};
</script>

{#snippet committeeCell(memberWithCommittee: MemberWithCommittee, memberId: string | undefined)}
	{#if memberWithCommittee.alreadyAssigned}
		{@const assignedCommittee = committees?.find((c) => c.id === memberWithCommittee.committeeId)}
		<div class="flex items-center gap-2">
			<span class="badge badge-success">{assignedCommittee?.abbreviation}</span>
			<span class="text-xs text-gray-500">({m.alreadyAssigned()})</span>
		</div>
	{:else}
		<select class="select" bind:value={memberWithCommittee.committeeId}>
			<option value="" selected>{m.pleaseSelect()}</option>
			{#each committees ?? [] as committee (committee.id)}
				<option value={committee.id} disabled={isCommitteeFull(committee, memberId)}>
					{committee.abbreviation}
				</option>
			{/each}
		</select>
	{/if}
{/snippet}

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-4">
		<a class="btn btn-square" aria-label="Back" href={resolve(`/dashboard/${params.conferenceId}`)}>
			<i class="fa-duotone fa-arrow-left text-xl"></i>
		</a>
		<h1 class="text-2xl font-bold">{m.committeeAssignment()}</h1>
	</div>

	{#if members?.every((member) => !!member.assignedCommittee)}
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
			{#each committees ?? [] as committee (committee.id)}
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
				{#each membersWithCommittees ?? [] as memberWithCommittee (memberWithCommittee.delegationMemberId)}
					{@const member = members?.find((me) => me.id === memberWithCommittee.delegationMemberId)}
					<tr>
						<td>{formatNames(member?.user.givenName, member?.user.familyName)}</td>
						<td>
							{@render committeeCell(memberWithCommittee, member?.id)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if delegationMember?.isHeadDelegate}
			{#if unassignedMembers.length > 0}
				<button
					class="btn btn-primary"
					disabled={unassignedMembers.some((x) => !x.committeeId)}
					onclick={sendCommitteeAssignment}>{m.save()}</button
				>
			{/if}
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
