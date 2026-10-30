<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import { toast } from 'svelte-sonner';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { fetchCommitteeAssignment } from './committeeAssignment';
	import { chosenAssignments } from './chosenAssignments';
	import formatNames from '#lib/helpers/formatNames';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = $derived(await getCurrentUser());

	const assignment = $derived(await fetchCommitteeAssignment(params.conferenceId, currentUser.sub));
	const delegationMember = $derived(assignment.delegationMember);
	let members = $derived(delegationMember?.delegation.members);
	let delegation = $derived(delegationMember?.delegation);
	let committees = $derived(
		assignment.committees.filter((c) =>
			c.roles.some((role) => role.id === delegation?.assignedRole?.id)
		)
	);
	const isHeadDelegate = $derived(!!delegationMember?.isHeadDelegate);

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
	const pickedCount = $derived(membersWithCommittees.filter((x) => !!x.committeeId).length);
	const allAssigned = $derived(
		membersWithCommittees.length > 0 && membersWithCommittees.every((x) => x.alreadyAssigned)
	);

	/** Seats of `committee` taken or picked, leaving out `memberId`'s own pick. */
	const seatsTaken = (committee: Committee, memberId?: string) =>
		membersWithCommittees.filter(
			(x) => x.committeeId === committee.id && x.delegationMemberId !== memberId
		).length;

	/** Whether every seat of `committee` is taken by someone else, so `memberId` cannot pick it. */
	const isCommitteeFull = (committee: Committee, memberId: string) =>
		seatsTaken(committee, memberId) >= committee.numOfSeatsPerDelegation;

	const pick = (memberWithCommittee: MemberWithCommittee, committeeId: string) => {
		// Clicking the picked committee again takes the pick back.
		memberWithCommittee.committeeId =
			memberWithCommittee.committeeId === committeeId ? null : committeeId;
	};

	const initials = (givenName?: string, familyName?: string) =>
		`${givenName?.at(0) ?? ''}${familyName?.at(0) ?? ''}`.toUpperCase();

	let saving = $state(false);

	const sendCommitteeAssignment = async () => {
		// Only unassigned members are sent - already assigned ones are locked
		const assignments = chosenAssignments(unassignedMembers);
		if (!assignments) {
			toast.error(m.pleaseAssignAllMembers());
			return;
		}

		saving = true;
		try {
			const promise = client.mutate.assignCommitteesToDelegationMembers({
				__args: { conferenceId: params.conferenceId, assignments },
				id: true,
				assignedCommittee: { id: true }
			});
			toast.promise(promise, genericPromiseToastMessages);
			const assigned = await promise;
			if (assigned.length === 0) {
				toast.error(m.failedToAssignCommittees());
				throw new Error('Failed to assign committees');
			}
		} finally {
			saving = false;
		}
	};
</script>

{#snippet committeeCard(committee: Committee)}
	{@const taken = seatsTaken(committee)}
	{@const full = taken >= committee.numOfSeatsPerDelegation}
	<div
		class="flex flex-col gap-3 rounded-box border bg-base-200 p-4 transition-colors duration-300 {full
			? 'border-success/50'
			: 'border-base-300'}"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex min-w-0 flex-col">
				<span class="text-xl font-bold">{committee.abbreviation}</span>
				<span class="text-sm text-base-content/70">{committee.name}</span>
			</div>
			{#if full}
				<i class="fa-sharp-duotone fa-solid fa-circle-check text-xl text-success"></i>
			{/if}
		</div>
		<div class="flex items-center gap-3">
			<div class="flex gap-1">
				{#each { length: committee.numOfSeatsPerDelegation } as _, i (i)}
					<i
						class="fa-sharp-duotone fa-solid fa-user transition-colors duration-300 {i < taken
							? 'text-primary'
							: 'text-base-content/20'}"
					></i>
				{/each}
			</div>
			<span class="text-xs text-base-content/60">
				{m.committeeSeatsTaken({ taken, seats: committee.numOfSeatsPerDelegation })}
			</span>
		</div>
	</div>
{/snippet}

{#snippet memberRow(memberWithCommittee: MemberWithCommittee)}
	{@const member = members?.find((me) => me.id === memberWithCommittee.delegationMemberId)}
	{@const picked = committees.find((c) => c.id === memberWithCommittee.committeeId)}
	<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<div
				class="grid size-10 shrink-0 place-items-center rounded-full font-bold transition-colors duration-300 {picked
					? 'bg-primary text-primary-content'
					: 'bg-base-300'}"
			>
				{initials(member?.user.givenName, member?.user.familyName)}
			</div>
			<div class="flex flex-col">
				<span class="font-bold">
					{formatNames(member?.user.givenName, member?.user.familyName)}
				</span>
				{#if member?.isHeadDelegate}
					<span class="flex items-center gap-1 text-xs text-base-content/60">
						<i class="fa-sharp-duotone fa-solid fa-crown"></i>
						{m.headDelegate()}
					</span>
				{/if}
			</div>
		</div>

		{#if memberWithCommittee.alreadyAssigned}
			<span class="badge badge-success badge-soft gap-2 self-start sm:self-auto">
				<i class="fa-sharp-duotone fa-solid fa-lock"></i>
				<span class="font-bold">{picked?.abbreviation}</span>
				<span class="text-xs">{m.alreadyAssigned()}</span>
			</span>
		{:else if isHeadDelegate}
			<div class="flex flex-wrap gap-2" role="radiogroup">
				{#each committees as committee (committee.id)}
					{@const selected = memberWithCommittee.committeeId === committee.id}
					<button
						type="button"
						role="radio"
						aria-checked={selected}
						title={committee.name}
						class="btn btn-sm transition-all duration-200 {selected
							? 'btn-primary'
							: 'btn-outline'}"
						disabled={!selected &&
							isCommitteeFull(committee, memberWithCommittee.delegationMemberId)}
						onclick={() => pick(memberWithCommittee, committee.id)}
					>
						{#if selected}<i class="fa-sharp-duotone fa-solid fa-check"></i>{/if}
						{committee.abbreviation}
					</button>
				{/each}
			</div>
		{:else}
			<span class="badge badge-ghost gap-2 self-start sm:self-auto">
				<i class="fa-sharp-duotone fa-solid fa-hourglass-half"></i>
				{m.notYetAssigned()}
			</span>
		{/if}
	</li>
{/snippet}

<div class="flex w-full flex-col gap-6">
	<div class="flex flex-col gap-2">
		<BackToDashboard conferenceId={params.conferenceId} />
		<div class="flex flex-col">
			<h1 class="text-2xl font-bold">{m.committeeAssignment()}</h1>
			<p class="text-sm text-base-content/70">{m.committeeAssignmentDescription()}</p>
		</div>
	</div>

	{#if allAssigned}
		<div class="alert alert-success alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-circle-check text-2xl"></i>
			<span class="font-bold">{m.committeesSuccessfullyAssigned()}</span>
		</div>
	{:else if !isHeadDelegate}
		<div class="alert alert-warning alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-2xl"></i>
			<span>{m.onlyHeadDelegateCanAssignCommittees()}</span>
		</div>
	{/if}

	<DashboardSection
		icon="podium"
		title={m.committees()}
		description={m.theFollowingCommitteesAreAssignable()}
	>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each committees as committee (committee.id)}
				{@render committeeCard(committee)}
			{/each}
		</div>
	</DashboardSection>

	<DashboardSection icon="users" title={m.delegationMembers()}>
		<ul class="flex flex-col divide-y divide-base-300">
			{#each membersWithCommittees as memberWithCommittee (memberWithCommittee.delegationMemberId)}
				{@render memberRow(memberWithCommittee)}
			{/each}
		</ul>

		{#if isHeadDelegate && unassignedMembers.length > 0}
			<div
				class="mt-4 flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="flex flex-col gap-1">
					<span class="text-sm text-base-content/70">
						{m.committeeAssignmentProgress({
							assigned: pickedCount,
							total: membersWithCommittees.length
						})}
					</span>
					<progress
						class="progress progress-primary w-56"
						value={pickedCount}
						max={membersWithCommittees.length}
					></progress>
				</div>
				<button
					class="btn btn-primary"
					disabled={unassignedMembers.some((x) => !x.committeeId) || saving}
					onclick={sendCommitteeAssignment}
				>
					{#if saving}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-floppy-disk"></i>
					{/if}
					{m.save()}
				</button>
			</div>
		{/if}
	</DashboardSection>
</div>
