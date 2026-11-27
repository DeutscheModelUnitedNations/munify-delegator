<!--
	@component
	One committee in the committees page's list: abbreviation, name, nation and agenda item counts,
	and a badge counting the agenda items still lacking points for discussion.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { agendaItemsWithoutPoints } from './committeeChanges';
	import type { ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		active: boolean;
		onSelect: () => void;
	}

	let { committee, active, onSelect }: Props = $props();

	const withoutPoints = $derived(agendaItemsWithoutPoints(committee));
	const counts = $derived([
		{ icon: 'ph-flag', value: committee.roles.length },
		{ icon: 'ph-lectern', value: committee.agendaItems.length }
	]);
</script>

<li>
	<button
		type="button"
		class={[
			'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-2 px-4 py-3',
			active && 'menu-active'
		]}
		aria-current={active ? 'true' : undefined}
		onclick={onSelect}
	>
		<span class={['pt-0.5 text-xs font-semibold', !active && 'text-primary']}>
			{committee.abbreviation}
		</span>
		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="leading-snug font-medium break-words hyphens-auto">{committee.name}</span>
			<span class="flex gap-3 text-xs opacity-70" aria-hidden="true">
				{#each counts as count (count.icon)}
					<span class="flex items-center gap-1">
						<i aria-hidden="true" class="ph-duotone {count.icon}"></i>{count.value}
					</span>
				{/each}
			</span>
			<span class="sr-only">
				{m.committeeNavSummary({
					nations: committee.roles.length,
					agendaItems: committee.agendaItems.length
				})}
			</span>
		</span>
		{#if withoutPoints > 0}
			<span
				class="badge badge-warning badge-xs mt-0.5 gap-0.5"
				title={m.agendaItemsWithoutPoints({ count: withoutPoints })}
			>
				<i aria-hidden="true" class="ph-fill ph-warning"></i>
				<span aria-hidden="true">{withoutPoints}</span>
				<span class="sr-only">{m.agendaItemsWithoutPoints({ count: withoutPoints })}</span>
			</span>
		{/if}
	</button>
</li>
