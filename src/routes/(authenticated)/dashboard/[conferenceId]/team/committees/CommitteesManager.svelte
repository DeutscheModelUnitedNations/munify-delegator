<!--
	@component
	The team's committees page (`team/committees`): the conference's committees in a list, the one
	picked beside it with its settings and agenda items, edited in place. The URL names the picked
	committee (`?committee=`) and an agenda item to open (`?item=`), so links can point at either.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import {
		canCreateCommittees,
		canDeleteCommittees,
		canEditCommittees,
		canPlanSeats
	} from '#lib/helpers/teamAccess';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import AddCommitteeModal from './AddCommitteeModal.svelte';
	import CommitteeDetail from './CommitteeDetail.svelte';
	import CommitteeNav from './CommitteeNav.svelte';
	import DeleteAgendaItemModal from './DeleteAgendaItemModal.svelte';
	import DeleteCommitteeModal from './DeleteCommitteeModal.svelte';
	import { selectedCommittee } from './committeeChanges';
	import type { AgendaItem, ManagedCommittee } from './types';

	let { conferenceId }: { conferenceId: string } = $props();

	const params = queryParameters({ committee: true, item: true });

	const [committees, access] = $derived(
		await Promise.all([
			client.liveQuery.committees({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true,
				resolutionHeadline: true,
				roles: { id: true },
				delegationMembers: { id: true },
				agendaItems: {
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

	const selected = $derived(selectedCommittee({ committees, id: params.committee }));

	function select(id: string) {
		params.item = null;
		params.committee = id;
	}

	let addCommitteeModalOpen = $state(false);
	let committeeToDelete = $state<ManagedCommittee>();
	let agendaItemToDelete = $state<AgendaItem>();
</script>

<div class="flex flex-col gap-6">
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

	<div class="flex flex-wrap items-start gap-8">
		<div class="flex max-w-sm min-w-0 flex-[1_1_16rem] flex-col gap-2">
			{#if committees.length > 0}
				<CommitteeNav {committees} selectedId={selected?.id} onSelect={select} />
			{/if}
			{#if canCreate}
				<button
					type="button"
					class="btn btn-outline btn-sm w-full"
					data-tour="team.committees.add"
					onclick={() => (addCommitteeModalOpen = true)}
				>
					<i aria-hidden="true" class="ph-duotone ph-plus"></i>
					{m.addCommittee()}
				</button>
			{/if}
		</div>

		<div class="min-w-0 flex-[999_1_32rem]">
			{#if selected}
				{#key selected.id}
					<CommitteeDetail
						committee={selected}
						{canEdit}
						{canDelete}
						openItemId={params.item}
						onDeleteAgendaItem={(item) => (agendaItemToDelete = item)}
						onDelete={() => (committeeToDelete = selected)}
					/>
				{/key}
			{:else}
				<p class="bg-base-200 rounded-box p-6 text-center opacity-70">{m.noCommittees()}</p>
			{/if}
		</div>
	</div>
</div>

<AddCommitteeModal {conferenceId} bind:open={addCommitteeModalOpen} onCreated={select} />
<DeleteCommitteeModal bind:committee={committeeToDelete} />
<DeleteAgendaItemModal bind:item={agendaItemToDelete} />
