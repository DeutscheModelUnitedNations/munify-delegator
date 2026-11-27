<!--
	@component
	The committees page's list of committees: a heading with the count and the add button, then one
	entry per committee (`CommitteeNavEntry`). Picking one shows it beside the list.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import CommitteeNavEntry from './CommitteeNavEntry.svelte';
	import type { ManagedCommittee } from './types';

	interface Props {
		committees: readonly ManagedCommittee[];
		selectedId: string | undefined;
		onSelect: (id: string) => void;
		/** Shows the add button, which calls this. */
		onAdd?: () => void;
	}

	let { committees, selectedId, onSelect, onAdd }: Props = $props();
</script>

<nav
	aria-labelledby="committee-list-heading"
	class="border-base-300 bg-base-100 rounded-box flex flex-col overflow-hidden border"
>
	<div
		class="border-base-300 bg-base-200 flex items-center justify-between gap-2 border-b py-1 ps-4 pe-1"
	>
		<h2
			id="committee-list-heading"
			class="text-base-content/70 text-xs font-semibold tracking-wide uppercase"
		>
			{m.committees()}
			<span class="ms-1 font-normal">{committees.length}</span>
		</h2>
		{#if onAdd}
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-square"
				aria-label={m.addCommittee()}
				title={m.addCommittee()}
				data-tour="team.committees.add"
				onclick={onAdd}
			>
				<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			</button>
		{/if}
	</div>

	{#if committees.length === 0}
		<p class="p-4 text-sm opacity-70">{m.noCommittees()}</p>
	{:else}
		<ul
			class="menu divide-base-300 w-full divide-y p-0 [&_li>*]:rounded-none"
			data-tour="team.committees.list"
		>
			{#each committees as committee (committee.id)}
				<CommitteeNavEntry
					{committee}
					active={committee.id === selectedId}
					onSelect={() => onSelect(committee.id)}
				/>
			{/each}
		</ul>
	{/if}
</nav>
