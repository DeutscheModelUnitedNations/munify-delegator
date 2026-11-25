<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { addEntry, entriesOfPage, removeEntry, updateEntry } from '#lib/guide/outlineEditing';
	import { fetchCustomRoles, toRoleOptions } from '../../workspaceData';
	import EntryCard from './EntryCard.svelte';
	import { getOutlineDraft } from '../../outlineDraft.svelte';

	/**
	 * Where the open page stands in the sidebar draft: each entry with its own title and who sees
	 * it, or a way to add it. Committee and agenda item pages come through the template.
	 */
	interface Props {
		conferenceId: string;
		pageId: string;
		kind: 'GENERAL' | 'COMMITTEE' | 'AGENDA_ITEM';
	}

	let { conferenceId, pageId, kind }: Props = $props();

	const draft = getOutlineDraft();
	const roleRows = $derived(await fetchCustomRoles(conferenceId));
	const roles = $derived(toRoleOptions(roleRows));
	const outline = $derived(draft.outline);
	const places = $derived(entriesOfPage({ outline, pageId }));
	const inTemplate = $derived(
		outline.committeeTemplate?.slots.some(
			(slot) => slot.type === 'page' && slot.pageId === pageId
		) ?? false
	);
	let target = $state(0);
</script>

<section
	class="flex flex-col gap-3"
	aria-labelledby="guide-entries"
	data-tour="team.guidePage.entries"
>
	<h2 id="guide-entries" class="text-xs font-bold tracking-wider uppercase opacity-80">
		{m.guideInSidebar()}
	</h2>
	{#if kind !== 'GENERAL'}
		<p class="text-sm opacity-70">{m.guideOwnedPageInTemplate()}</p>
	{:else}
		{#each places as at (`${at.section}-${at.entry}`)}
			{@const entry = outline.sections[at.section].entries[at.entry]}
			<EntryCard
				section={outline.sections[at.section].title}
				label={entry.label}
				audience={entry.audience}
				{roles}
				onLabel={(label) =>
					draft.change(updateEntry({ outline, at, change: (e) => ({ ...e, label }) }))}
				onAudience={(audience) =>
					draft.change(updateEntry({ outline, at, change: (e) => ({ ...e, audience }) }))}
				onRemove={() => draft.change(removeEntry({ outline, at }))}
			/>
		{/each}
		{#if inTemplate || places.length === 0}
			<p class="text-sm opacity-70">
				{inTemplate ? m.guidePageInTemplate() : m.guidePageNotInSidebar()}
			</p>
		{/if}
		{#if outline.sections.length > 0}
			<div class="join w-full">
				<select
					class="select select-sm join-item min-w-0 flex-1"
					aria-label={m.guideTreeAddTo()}
					bind:value={target}
				>
					{#each outline.sections as section, index (section.id)}
						<option value={index}>{section.title}</option>
					{/each}
				</select>
				<button
					class="btn btn-sm join-item"
					onclick={() => draft.change(addEntry({ outline, section: target, pageId }))}
				>
					<i class="ph-duotone ph-plus" aria-hidden="true"></i>
					{m.guideTreeAddToShort()}
				</button>
			</div>
		{/if}
	{/if}
</section>
