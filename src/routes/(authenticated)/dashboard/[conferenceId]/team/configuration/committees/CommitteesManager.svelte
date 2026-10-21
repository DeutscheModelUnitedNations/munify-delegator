<!--
	@component
	The committees of a conference with their agenda items: create, edit and delete a committee, edit
	or delete an agenda item, create a new one. Used by the configuration page's committees tab and
	by the standalone committees page.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { canEditCommittees, canEditConference } from '#lib/helpers/teamAccess.js';
	import { fetchTeamAccess } from '#lib/api/teamAccess.js';
	import { m } from '#lib/paraglide/messages.js';
	import AddAgendaItemModal from './AddAgendaItemModal.svelte';
	import AddCommitteeModal from './AddCommitteeModal.svelte';
	import CommitteeCard from './CommitteeCard.svelte';
	import DeleteAgendaItemModal from './DeleteAgendaItemModal.svelte';
	import DeleteCommitteeModal from './DeleteCommitteeModal.svelte';
	import EditAgendaItemModal from './EditAgendaItemModal.svelte';
	import EditCommitteeModal from './EditCommitteeModal.svelte';
	import type { AgendaItem, ManagedCommittee } from './types';

	let { conferenceId }: { conferenceId: string } = $props();

	const [committees, access] = $derived(
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
				roles: { id: true },
				delegationMembers: { id: true },
				agendaItems: { id: true, title: true, teaserText: true, papers: { id: true } }
			}),
			fetchTeamAccess(conferenceId)
		])
	);
	/** Editing committees, their seats and agenda items: project management and the content lead */
	const canEdit = $derived(canEditCommittees(access));
	/** Creating and deleting committees stays with project management */
	const canCreateAndDelete = $derived(canEditConference(access));

	let addCommitteeModalOpen = $state(false);
	let committeeToAddAgendaItem = $state<ManagedCommittee>();
	let committeeToEdit = $state<ManagedCommittee>();
	let committeeToDelete = $state<ManagedCommittee>();
	let agendaItemToEdit = $state<AgendaItem>();
	let agendaItemToDelete = $state<AgendaItem>();
</script>

<div class="flex flex-col gap-20">
	{#if canCreateAndDelete}
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
			{canEdit}
			canDelete={canCreateAndDelete}
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
<EditCommitteeModal bind:committee={committeeToEdit} canConfigure={canEdit} />
<DeleteCommitteeModal bind:committee={committeeToDelete} />
<EditAgendaItemModal bind:item={agendaItemToEdit} />
<DeleteAgendaItemModal bind:item={agendaItemToDelete} />
