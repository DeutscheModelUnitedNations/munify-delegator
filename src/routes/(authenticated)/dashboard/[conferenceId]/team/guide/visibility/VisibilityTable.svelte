<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Outline } from '#lib/guide/outline';
	import { updateSection, updateTopicOverview } from '#lib/guide/outlineEditing';
	import type { VisibilityRow } from '#lib/guide/workspace';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import AudienceModal from '../tree/AudienceModal.svelte';
	import TopicReadersModal from '../tree/TopicReadersModal.svelte';
	import VisibilityTableRow from './VisibilityTableRow.svelte';
	import { VISIBILITY_CELL } from './visibilityCells';

	/**
	 * Sections (and entries with their own audience) against groups of readers. A column heading
	 * previews that group; a section's button changes who sees it.
	 */
	interface Props {
		rows: readonly VisibilityRow[];
		outline: Outline;
		roles: readonly { id: string; name: string }[];
		groups: readonly string[];
		picked: number;
		onPick: (index: number) => void;
	}

	let { rows, outline, roles, groups, picked, onPick }: Props = $props();

	const draft = getOutlineDraft();
	let editing = $state<number | null>(null);
	let open = $state(false);
	let choosingTopicReaders = $state(false);
	const section = $derived(editing === null ? undefined : outline.sections[editing]);
</script>

<section class="flex min-w-0 flex-1 flex-col gap-3" data-tour="team.guideVisibility.table">
	<div class="overflow-x-auto">
		<table class="table-sm table" data-testid="guide-visibility-table">
			<caption class="sr-only">{m.guideTabVisibility()}</caption>
			<thead>
				<tr>
					<th scope="col">{m.guideSectionTitle()}</th>
					{#each groups as group, index (index)}
						<th scope="col" class={['text-center', index === picked && 'bg-base-200']}>
							<button
								class="btn btn-ghost btn-xs font-semibold"
								aria-pressed={index === picked}
								onclick={() => onPick(index)}
							>
								{group}
							</button>
						</th>
					{/each}
					<th scope="col"><span class="sr-only">{m.guideAudience()}</span></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.key)}
					<VisibilityTableRow
						{row}
						{picked}
						onEdit={(index) => {
							editing = index;
							open = true;
						}}
						onEditTopics={() => (choosingTopicReaders = true)}
					/>
				{/each}
			</tbody>
		</table>
	</div>
	<ul class="flex flex-wrap gap-4 text-sm opacity-80">
		{#each Object.values(VISIBILITY_CELL) as cell (cell.icon)}
			<li class="flex items-center gap-1">
				<i class={['text-lg', cell.icon, cell.look]} aria-hidden="true"></i>
				{cell.label()}
			</li>
		{/each}
		<li>{m.guideTeamSeesAll()}</li>
	</ul>
</section>

{#if section && editing !== null}
	{@const index = editing}
	<AudienceModal
		bind:open
		title={section.title}
		value={section.audience}
		{roles}
		onChange={(audience) =>
			draft.change(updateSection({ outline, index, change: (s) => ({ ...s, audience }) }))}
	/>
{/if}

{#if choosingTopicReaders && outline.topicOverview}
	<TopicReadersModal
		bind:open={choosingTopicReaders}
		readers={outline.topicOverview.readers}
		{roles}
		onChange={(readers) => draft.change(updateTopicOverview({ outline, readers }))}
	/>
{/if}
