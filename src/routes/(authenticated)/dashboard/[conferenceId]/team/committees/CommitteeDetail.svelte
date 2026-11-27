<!--
	@component
	The committee picked on the committees page: its settings, its agenda items opening in place, a
	form for a new agenda item and, for project management, deleting the committee.
	Keyed by the committee's id by its parent, so switching committees starts fresh.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AgendaItemPanel from './AgendaItemPanel.svelte';
	import CommitteeSettingsForm from './CommitteeSettingsForm.svelte';
	import NewAgendaItemForm from './NewAgendaItemForm.svelte';
	import { committeeDeletable } from './committeeChanges';
	import type { AgendaItem, ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		canEdit: boolean;
		canDelete: boolean;
		/** The agenda item a link named, opened on arrival. */
		openItemId?: string | null;
		onDeleteAgendaItem: (item: AgendaItem) => void;
		onDelete: () => void;
	}

	let { committee, canEdit, canDelete, openItemId, onDeleteAgendaItem, onDelete }: Props = $props();

	const deletable = $derived(committeeDeletable(committee));
</script>

<section aria-labelledby="committee-heading" class="flex min-w-0 flex-col gap-8">
	<header class="flex flex-col gap-1">
		<h2 id="committee-heading" class="text-2xl font-bold break-words hyphens-auto">
			{committee.name}
			<span class="text-primary">({committee.abbreviation})</span>
		</h2>
		<p class="flex flex-wrap gap-x-4 text-sm opacity-70">
			<span class="flex items-center gap-1">
				<i aria-hidden="true" class="ph-duotone ph-flag"></i>
				{m.committeeNationCount({ count: committee.roles.length })}
			</span>
			<span class="flex items-center gap-1">
				<i aria-hidden="true" class="ph-duotone ph-chair"></i>
				{m.seatsPerDelegation()}: {committee.numOfSeatsPerDelegation}
			</span>
		</p>
	</header>

	<CommitteeSettingsForm {committee} {canEdit} />

	<section aria-labelledby="agenda-items-heading" class="flex flex-col gap-3">
		<h3 id="agenda-items-heading" class="text-lg font-bold">{m.agendaItems()}</h3>
		{#if committee.agendaItems.length === 0}
			<p class="text-sm opacity-70">{m.noAgendaItemsYet()}</p>
		{/if}
		<div class="flex flex-col gap-2" data-tour="team.committees.agenda-items">
			{#each committee.agendaItems as item (item.id)}
				<AgendaItemPanel
					{item}
					{canEdit}
					initiallyOpen={item.id === openItemId}
					onDelete={() => onDeleteAgendaItem(item)}
				/>
			{/each}
		</div>
		{#if canEdit}
			<NewAgendaItemForm committeeId={committee.id} />
		{/if}
	</section>

	{#if canDelete}
		<div class="border-base-300 flex flex-wrap items-center gap-4 border-t pt-4">
			<button
				type="button"
				class="btn btn-outline btn-error btn-sm"
				disabled={!deletable}
				onclick={onDelete}
			>
				<i aria-hidden="true" class="ph-duotone ph-trash"></i>
				{m.deleteCommittee()}
			</button>
			<p class="text-xs opacity-70">
				{deletable ? m.committeeDeleteHint() : m.committeeDeleteDisabled()}
			</p>
		</div>
	{/if}
</section>
