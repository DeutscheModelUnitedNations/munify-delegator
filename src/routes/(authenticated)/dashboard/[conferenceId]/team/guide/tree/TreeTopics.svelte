<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog, promptDialog } from '#lib/state/dialogs.svelte.js';
	import type { TopicOverview } from '#lib/guide/outline';
	import { setTopicOverviewEnabled, updateTopicOverview } from '#lib/guide/outlineEditing';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import { topicReadersLabel } from '../guideAudience';
	import { blockMoveItems } from './blockItems';
	import TopicReadersModal from './TopicReadersModal.svelte';
	import TreeHeading from './TreeHeading.svelte';
	import type { TreeMenuItem } from './treeMenu';
	import { getTreeContext } from './treeContext';

	/**
	 * The topic overview in the tree: one section for readers without a committee of their own,
	 * listing every committee's page with its agenda items' pages. It fills itself from the
	 * committees, so the tree shows what it lists and who reads it.
	 */
	interface Props {
		overview: TopicOverview;
		block: number;
		blocks: number;
		committees: readonly { id: string; name: string }[];
	}

	let { overview, block, blocks, committees }: Props = $props();

	const draft = getOutlineDraft();
	const tree = getTreeContext();
	const outline = $derived(draft.outline);
	let choosing = $state(false);

	async function rename() {
		const title = await promptDialog({
			text: m.guideTreeRename(),
			initialValue: overview.title,
			confirmLabel: m.save()
		});
		if (!title?.trim()) return;
		draft.change(updateTopicOverview({ outline, title: title.trim() }));
	}

	async function remove() {
		if (!(await confirmDialog({ text: m.guideTopicOverviewRemoveConfirm(), danger: true }))) return;
		draft.change(setTopicOverviewEnabled({ outline, enabled: false, title: '' }));
	}

	const items = $derived<TreeMenuItem[]>([
		...blockMoveItems({ outline, block, blocks, change: draft.change }),
		{ label: m.guideTreeRename(), icon: 'ph-text-aa', onSelect: rename },
		{ label: m.guideTopicOverviewReaders(), icon: 'ph-eye', onSelect: () => (choosing = true) },
		{ label: m.guideTopicOverviewRemove(), icon: 'ph-trash', danger: true, onSelect: remove }
	]);
</script>

<section
	class="border-base-content/40 bg-base-100/60 mt-2 flex flex-col rounded-sm border border-dashed px-1 pb-2"
	aria-label={overview.title}
	data-testid="guide-tree-topics"
>
	<TreeHeading
		title={overview.title}
		note={topicReadersLabel({ readers: overview.readers, roles: tree.roles })}
		icon="ph-books"
		{block}
		{items}
	/>
	<p class="px-2 text-xs opacity-70">
		{m.guideTopicOverviewHint({ count: committees.length })}
	</p>
	{#if committees.length > 0}
		<p class="px-2 pt-1 text-xs opacity-80">
			{committees.map((committee) => committee.name).join(' · ')}
		</p>
	{/if}
</section>

{#if choosing}
	<TopicReadersModal
		bind:open={choosing}
		readers={overview.readers}
		roles={tree.roles}
		onChange={(readers) => draft.change(updateTopicOverview({ outline, readers }))}
	/>
{/if}
