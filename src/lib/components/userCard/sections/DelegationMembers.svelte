<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import formatNames from '#lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import CommitteeAssignmentModal from '#lib/components/registrationAdmin/CommitteeAssignmentModal.svelte';
	import HeadDelegateModal from '#lib/components/registrationAdmin/HeadDelegateModal.svelte';
	import PersonRow from '../ui/PersonRow.svelte';
	import Row from '../ui/Row.svelte';
	import { byName, fetchDelegationSeat } from './delegationSeat';

	/** Who is in the person's delegation, in which committee, each removable, and who leads it. A column of a `Section`. */
	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
	}

	let { delegationId, conferenceId, userId }: Props = $props();

	const delegation = $derived(await fetchDelegationSeat(delegationId));
	const members = $derived(byName(delegation.members));
	// Only a nation sits in committees
	const nationRoleId = $derived(
		splitRole(delegation.assignedRole).nation ? delegation.assignedRole?.id : null
	);
	type Member = (typeof members)[number];

	let headDelegateModalOpen = $state(false);
	let committeeAssignmentModalOpen = $state(false);

	async function removeMember(member: Member) {
		const name = formatNames({
			givenName: member.user.givenName,
			familyName: member.user.familyName,
			options: { givenNameUppercase: false, familyNameUppercase: false }
		});
		const text = m.confirmRemoveFromDelegation({ name });
		if (!(await confirmDialog({ text, danger: true, confirmLabel: m.removeMember() }))) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegationMember({ __args: { id: member.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

<Row icon="users" title={m.delegationMembers()} />
<ul
	class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))] gap-x-12"
	aria-label={m.delegationMembers()}
>
	{#each members as member (member.id)}
		<PersonRow
			user={member.user}
			isHeadDelegate={member.isHeadDelegate}
			current={member.user.id === userId}
		>
			{#snippet trailing()}
				{#if nationRoleId}
					<span class="text-base-content/60 text-xs" title={member.assignedCommittee?.name}>
						{member.assignedCommittee?.abbreviation ?? '–'}
					</span>
				{/if}
				<button
					class="btn btn-ghost btn-sm btn-square hover:text-error opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
					onclick={() => removeMember(member)}
					aria-label={m.removeMember()}
					title={m.removeMember()}
				>
					<i aria-hidden="true" class="ph-duotone ph-user-minus text-lg"></i>
				</button>
			{/snippet}
		</PersonRow>
	{/each}
</ul>
<!-- The buttons' icons below the names -->
<div class="flex flex-wrap gap-1 pt-1 pl-6">
	{#if nationRoleId}
		<button
			class="btn btn-sm btn-ghost text-primary"
			disabled={members.length === 0}
			onclick={() => (committeeAssignmentModalOpen = true)}
		>
			<i aria-hidden="true" class="ph-duotone ph-squares-four text-lg"></i>
			{m.committeeAssignment()}
		</button>
	{/if}
	<button class="btn btn-sm btn-ghost text-primary" onclick={() => (headDelegateModalOpen = true)}>
		<i aria-hidden="true" class="ph-duotone ph-medal text-lg"></i>
		{m.headDelegate()}
	</button>
</div>

<HeadDelegateModal bind:open={headDelegateModalOpen} {delegationId} {members} />
<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	{nationRoleId}
	{conferenceId}
/>
