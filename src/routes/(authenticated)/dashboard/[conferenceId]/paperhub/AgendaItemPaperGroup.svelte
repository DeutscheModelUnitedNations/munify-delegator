<script lang="ts">
	import type { Snippet } from 'svelte';
	import PaperGroupCollapse from './PaperGroupCollapse.svelte';
	import type { ExpandedPaperGroup } from './paperGroups.svelte';

	/** An agenda item's collapsible paper group, nested in its committee's. */
	interface Props {
		agendaItem: { id: string; title: string };
		/** Its position in the committee, for the alternating background. */
		index: number;
		openGroup: ExpandedPaperGroup;
		/** Controls shown in the header before the title. */
		leading?: Snippet;
		aside: Snippet;
		children: Snippet;
	}

	let { agendaItem, index, openGroup, leading, aside, children }: Props = $props();
</script>

<PaperGroupCollapse
	level="agendaItem"
	striped={index % 2 === 0}
	expanded={openGroup.topic === agendaItem.id}
	onToggle={() => openGroup.toggleAgendaItem(agendaItem.id)}
	{aside}
>
	{#snippet header()}
		{@render leading?.()}
		<h4 class="font-medium text-sm">{agendaItem.title}</h4>
	{/snippet}

	{@render children()}
</PaperGroupCollapse>
