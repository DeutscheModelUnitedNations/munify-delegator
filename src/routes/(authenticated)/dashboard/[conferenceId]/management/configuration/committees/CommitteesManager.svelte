<!--
	@component
	The committees of a conference with their agenda items: create, edit and delete a committee, edit
	or delete an agenda item, create a new one. Used by the configuration page's committees tab and
	by the standalone committees page.
-->
<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { canConfigureCommittees } from '$lib/helpers/managementAccess';
	import { m } from '$lib/paraglide/messages';
	import { managementMembership } from '../../managementMembership';
	import AddAgendaItemModal from './AddAgendaItemModal.svelte';
	import AddCommitteeModal from './AddCommitteeModal.svelte';
	import CommitteeCard from './CommitteeCard.svelte';
	import DeleteAgendaItemModal from './DeleteAgendaItemModal.svelte';
	import DeleteCommitteeModal from './DeleteCommitteeModal.svelte';
	import EditAgendaItemModal from './EditAgendaItemModal.svelte';
	import EditCommitteeModal from './EditCommitteeModal.svelte';
	import type { AgendaItem, ManagedCommittee } from './types';

	let { conferenceId }: { conferenceId: string } = $props();

	const [committees, membership] = $derived(
		await Promise.all([
			client.liveQuery.committees({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true,
				resolutionHeadline: true,
				nations: { alpha3Code: true },
				delegationMembers: { id: true },
				agendaItems: { id: true, title: true, teaserText: true, papers: { id: true } }
			}),
			managementMembership(conferenceId)
		])
	);
	/** creating and deleting committees and changing their seats per delegation */
	const canConfigure = $derived(canConfigureCommittees(membership));

	let addCommitteeModalOpen = $state(false);
	let committeeToAddAgendaItem = $state<ManagedCommittee>();
	let committeeToEdit = $state<ManagedCommittee>();
	let committeeToDelete = $state<ManagedCommittee>();
	let agendaItemToEdit = $state<AgendaItem>();
	let agendaItemToDelete = $state<AgendaItem>();
</script>

<div class="flex flex-col gap-20">
	{#if canConfigure}
		<button
			class="btn btn-ghost border-base-content/30 text-base-content/70 w-full border-dashed"
			onclick={() => (addCommitteeModalOpen = true)}
		>
			<i class="fa-sharp-duotone fa-solid fa-plus"></i>
			{m.addCommittee()}
		</button>
	{/if}

	{#each committees as committee (committee.id)}
		<CommitteeCard
			{committee}
			{canConfigure}
			onAddAgendaItem={() => (committeeToAddAgendaItem = committee)}
			onEdit={() => (committeeToEdit = committee)}
			onDelete={() => (committeeToDelete = committee)}
			onEditAgendaItem={(item) => (agendaItemToEdit = item)}
			onDeleteAgendaItem={(item) => (agendaItemToDelete = item)}
		/>
	{/each}
</div>

<AddCommitteeModal {conferenceId} bind:open={addCommitteeModalOpen} />
<AddAgendaItemModal bind:committee={committeeToAddAgendaItem} />
<EditCommitteeModal bind:committee={committeeToEdit} {canConfigure} />
<DeleteCommitteeModal bind:committee={committeeToDelete} />
<EditAgendaItemModal bind:item={agendaItemToEdit} />
<DeleteAgendaItemModal bind:item={agendaItemToDelete} />
