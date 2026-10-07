<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import AgendaItemRow from './AgendaItemRow.svelte';
	import type { AgendaItem, ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		canConfigure: boolean;
		onAddAgendaItem: () => void;
		onEdit: () => void;
		onDelete: () => void;
		onEditAgendaItem: (item: AgendaItem) => void;
		onDeleteAgendaItem: (item: AgendaItem) => void;
	}

	let {
		committee,
		canConfigure,
		onAddAgendaItem,
		onEdit,
		onDelete,
		onEditAgendaItem,
		onDeleteAgendaItem
	}: Props = $props();

	/** the server refuses to delete a committee with delegates or papers, see assertCommitteeDeletable */
	const deletable = $derived(
		committee.delegationMembers.length === 0 &&
			committee.agendaItems.every((item) => item.papers.length === 0)
	);
</script>

<section class="border-primary/40 overflow-hidden rounded-lg border">
	<header
		class="bg-primary/15 border-primary/40 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-1"
	>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
			<h3 class="text-lg font-bold">
				{committee.name}
				<span class="text-primary">({committee.abbreviation})</span>
			</h3>
			<span
				class="text-base-content/70 flex items-center gap-1 text-sm"
				title={m.committeeNationCount({ count: committee.nations.length })}
			>
				<i class="fa-duotone fa-flag"></i>
				{committee.nations.length}
			</span>
			<span
				class="text-base-content/70 flex items-center gap-1 text-sm"
				title={m.seatsPerDelegation()}
			>
				<i class="fa-duotone fa-chair"></i>
				{committee.numOfSeatsPerDelegation}
			</span>
		</div>
		<div class="flex gap-1">
			<button class="btn btn-ghost btn-xs" onclick={onEdit}>
				<i class="fa-duotone fa-pen-to-square"></i>
				{m.edit()}
			</button>
			{#if canConfigure}
				<span
					class={deletable ? '' : 'tooltip tooltip-left'}
					data-tip={deletable ? undefined : m.committeeDeleteDisabled()}
				>
					<button class="btn btn-ghost btn-xs text-error" disabled={!deletable} onclick={onDelete}>
						<i class="fa-duotone fa-trash"></i>
						{m.delete()}
					</button>
				</span>
			{/if}
		</div>
	</header>
	{#if committee.resolutionHeadline}
		<p class="text-base-content/70 px-4 pt-0.5 text-sm">
			<i class="fa-duotone fa-file-signature mr-1"></i>
			{m.resolutionHeadline()}: {committee.resolutionHeadline}
		</p>
	{/if}
	{#if committee.agendaItems.length > 0}
		<ul class="divide-base-content/10 divide-y">
			{#each committee.agendaItems as item (item.id)}
				<AgendaItemRow
					{item}
					onEdit={() => onEditAgendaItem(item)}
					onDelete={() => onDeleteAgendaItem(item)}
				/>
			{/each}
		</ul>
	{/if}
	<button
		class="btn btn-ghost btn-xs text-base-content/70 mx-3 my-1 w-[calc(100%-1.5rem)]"
		onclick={onAddAgendaItem}
	>
		<i class="fa-duotone fa-plus"></i>
		{m.createNewAgendaItem()}
	</button>
</section>
