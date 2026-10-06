<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { AgendaItem, ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		canConfigure: boolean;
		onEdit: () => void;
		onDelete: () => void;
		onEditAgendaItem: (item: AgendaItem) => void;
		onDeleteAgendaItem: (item: AgendaItem) => void;
	}

	let { committee, canConfigure, onEdit, onDelete, onEditAgendaItem, onDeleteAgendaItem }: Props =
		$props();

	/** the server refuses to delete a committee with delegates or papers, see assertCommitteeDeletable */
	const deletable = $derived(
		committee.delegationMembers.length === 0 &&
			committee.agendaItems.every((item) => item.papers.length === 0)
	);
</script>

<div class="card bg-base-200 shadow-md">
	<div class="card-body">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="text-xl font-bold">{committee.name} ({committee.abbreviation})</h3>
				<span class="badge badge-ghost">
					{m.committeeNationCount({ count: committee.nations.length })}
				</span>
				<span class="badge badge-ghost">
					{m.seatsPerDelegation()}: {committee.numOfSeatsPerDelegation}
				</span>
			</div>
			<div class="flex gap-1">
				<button class="btn btn-ghost btn-sm" onclick={onEdit}>
					<i class="fa-duotone fa-pen-to-square"></i>
					{m.edit()}
				</button>
				{#if canConfigure}
					<span
						class={deletable ? '' : 'tooltip tooltip-left'}
						data-tip={deletable ? undefined : m.committeeDeleteDisabled()}
					>
						<button
							class="btn btn-ghost btn-sm text-error"
							disabled={!deletable}
							onclick={onDelete}
						>
							<i class="fa-duotone fa-trash"></i>
							{m.delete()}
						</button>
					</span>
				{/if}
			</div>
		</div>
		{#if committee.resolutionHeadline}
			<p class="text-sm opacity-70">{m.resolutionHeadline()}: {committee.resolutionHeadline}</p>
		{/if}
		{#each committee.agendaItems as item (item.id)}
			<div class="bg-base-300 flex items-center gap-2 rounded-md px-4 py-2">
				<div class="flex w-full flex-1 flex-col gap-2">
					<h4>{item.title}</h4>
					{#if item.teaserText}
						<p class="text-xs whitespace-pre-wrap">{item.teaserText}</p>
					{/if}
					{#if item.papers.length > 0}
						<span class="badge badge-info badge-sm">
							{item.papers.length}
							{item.papers.length === 1 ? m.paper() : m.papers()}
						</span>
					{/if}
				</div>
				<button class="btn btn-sm" aria-label={m.edit()} onclick={() => onEditAgendaItem(item)}>
					<i class="fa-solid fa-pen-to-square"></i>
				</button>
				<button
					class="btn btn-error btn-sm"
					aria-label={m.delete()}
					onclick={() => onDeleteAgendaItem(item)}
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>
		{/each}
	</div>
</div>
