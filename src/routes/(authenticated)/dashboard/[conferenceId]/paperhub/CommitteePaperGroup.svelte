<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import PaperGroupCollapse from './PaperGroupCollapse.svelte';
	import type { ExpandedPaperGroup } from './paperGroups.svelte';

	/**
	 * A committee's collapsible paper group, headed by its abbreviation as a badge and its name.
	 * Without a `committee` it is the pseudo-committee of the introduction papers, which belong to
	 * no agenda item.
	 */
	interface Props {
		committee?: { id: string; name: string; abbreviation: string };
		openGroup: ExpandedPaperGroup;
		aside: Snippet;
		children: Snippet;
	}

	let { committee, openGroup, aside, children }: Props = $props();

	const groupId = $derived(committee?.id ?? 'introduction');
</script>

<PaperGroupCollapse
	level="committee"
	hoverClass={committee ? undefined : 'hover:bg-secondary/5'}
	expanded={openGroup.committee === groupId}
	onToggle={() => openGroup.toggleCommittee(groupId)}
	{aside}
>
	{#snippet header()}
		<div class="flex items-center gap-2">
			<span class="badge {committee ? 'badge-primary' : 'badge-secondary'} font-bold">
				{committee?.abbreviation ?? m.nonStateActorAbbreviation()}
			</span>
			<h3 class="text-lg font-semibold">{committee?.name ?? m.paperTypeIntroductionPapers()}</h3>
		</div>
	{/snippet}

	{@render children()}
</PaperGroupCollapse>
