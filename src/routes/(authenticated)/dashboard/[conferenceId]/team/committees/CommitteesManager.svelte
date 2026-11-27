<!--
	@component
	The committees of a conference with their agenda items: create, edit and delete a committee, edit
	or delete an agenda item, create a new one. The team's committees page (`team/committees`).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import {
		canCreateCommittees,
		canDeleteCommittees,
		canEditCommittees,
		canPlanSeats
	} from '#lib/helpers/teamAccess';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { m } from '#lib/paraglide/messages';
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
				agendaItems: {
					id: true,
					title: true,
					teaserText: true,
					discussionPoints: true,
					papers: { id: true }
				}
			}),
			fetchTeamAccess(conferenceId)
		])
	);
	/** Editing committees, their seats and agenda items: project management and the content lead */
	const canEdit = $derived(canEditCommittees(access));
	/** Creating committees: project management and the content lead */
	const canCreate = $derived(canCreateCommittees(access));
	/** Deleting a committee stays with project management */
	const canDelete = $derived(canDeleteCommittees(access));
	/** Seats, non-state actors and single roles live on the seat planning page */
	const showSeatPlanningHint = $derived(canPlanSeats(access));

	let addCommitteeModalOpen = $state(false);
	let committeeToAddAgendaItem = $state<ManagedCommittee>();
	let committeeToEdit = $state<ManagedCommittee>();
	let committeeToDelete = $state<ManagedCommittee>();
	let agendaItemToEdit = $state<AgendaItem>();
	let agendaItemToDelete = $state<AgendaItem>();
</script>

<div class="flex flex-col gap-10 sm:gap-20">
	{#if !canEdit}
		<div role="status" class="alert alert-info alert-soft text-sm">
			<i aria-hidden="true" class="ph-duotone ph-lock"></i>
			<span>{m.committeesReadOnly()}</span>
		</div>
	{/if}
	{#if showSeatPlanningHint}
		<div
			role="note"
			class="alert alert-info alert-soft text-sm"
			data-tour="team.committees.seat-planning-hint"
		>
			<i aria-hidden="true" class="ph-duotone ph-table"></i>
			<span>{m.committeesSeatPlanningHint()}</span>
			<a
				class="btn btn-sm btn-ghost"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/seat-planning', {
					conferenceId
				})}
			>
				{m.seatPlanningOpen()}
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
			</a>
		</div>
	{/if}

	{#if canCreate}
		<button
			class="btn btn-ghost border-base-content/30 text-base-content/70 w-full border-dashed"
			data-tour="team.committees.add"
			onclick={() => (addCommitteeModalOpen = true)}
		>
			<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			{m.addCommittee()}
		</button>
	{/if}

	{#each committees as committee (committee.id)}
		<CommitteeCard
			{committee}
			{canEdit}
			{canDelete}
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
