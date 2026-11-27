<!--
	@component
	The committees page's list of committees: picking one shows it beside the list. Each entry says
	how many nations sit in it, how many agenda items it has and how many of those still lack points
	for discussion.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { agendaItemsWithoutPoints } from './committeeChanges';
	import type { ManagedCommittee } from './types';

	interface Props {
		committees: readonly ManagedCommittee[];
		selectedId: string | undefined;
		onSelect: (id: string) => void;
	}

	let { committees, selectedId, onSelect }: Props = $props();
</script>

<nav aria-label={m.committees()} data-tour="team.committees.list">
	<ul class="menu bg-base-200 rounded-box w-full gap-1">
		{#each committees as committee (committee.id)}
			{@const active = committee.id === selectedId}
			{@const withoutPoints = agendaItemsWithoutPoints(committee)}
			<li>
				<button
					type="button"
					class="flex flex-col items-start gap-1 {active ? 'menu-active' : ''}"
					aria-current={active ? 'true' : undefined}
					onclick={() => onSelect(committee.id)}
				>
					<span class="flex w-full min-w-0 items-center gap-2">
						<span class="badge badge-sm {active ? 'badge-neutral' : 'badge-primary badge-soft'}">
							{committee.abbreviation}
						</span>
						<span class="min-w-0 font-bold break-words hyphens-auto">{committee.name}</span>
					</span>
					<span class="text-xs opacity-70">
						{m.committeeNavSummary({
							nations: committee.roles.length,
							agendaItems: committee.agendaItems.length
						})}
					</span>
					{#if withoutPoints > 0}
						<span class="flex items-center gap-1 text-xs font-bold">
							<i aria-hidden="true" class="ph-duotone ph-warning"></i>
							{m.agendaItemsWithoutPoints({ count: withoutPoints })}
						</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</nav>
