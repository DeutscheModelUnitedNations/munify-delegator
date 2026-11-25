<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog, promptDialog } from '#lib/state/dialogs.svelte.js';
	import type { OutlineSection } from '#lib/guide/outline';
	import {
		addEntry,
		dropInTree,
		moveEntry,
		removeEntry,
		removeSection,
		updateEntry,
		updateSection,
		type EntryAt
	} from '#lib/guide/outlineEditing';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import { audienceLabel } from '../guideAudience';
	import AudienceModal from './AudienceModal.svelte';
	import AddPageMenu from './AddPageMenu.svelte';
	import { blockMoveItems } from './blockItems';
	import TreeHeading from './TreeHeading.svelte';
	import TreeRow from './TreeRow.svelte';
	import type { TreeMenuItem } from './treeMenu';
	import { getTreeContext } from './treeContext';
	import { getTreeDrag } from './treeDrag.svelte';

	/** A section of the tree: its heading (title, who sees it) and its entries. */
	interface Props {
		section: OutlineSection;
		index: number;
		/** Its place among the tree's blocks (sections and the template). */
		block: number;
		blocks: number;
	}

	let { section, index, block, blocks }: Props = $props();

	const draft = getOutlineDraft();
	const tree = getTreeContext();
	const drag = getTreeDrag();
	let editingAudience = $state(false);

	const outline = $derived(draft.outline);
	const endKey = $derived(`end-${section.id}`);

	async function rename() {
		const title = await promptDialog({
			text: m.guideSectionTitle(),
			initialValue: section.title,
			confirmLabel: m.save()
		});
		if (!title?.trim()) return;
		draft.change(updateSection({ outline, index, change: (s) => ({ ...s, title: title.trim() }) }));
	}

	async function remove() {
		if (
			section.entries.length > 0 &&
			!(await confirmDialog({ text: m.guideTreeRemoveSectionConfirm(), danger: true }))
		) {
			return;
		}
		draft.change(removeSection({ outline, index }));
	}

	async function relabel(at: EntryAt, current: string | undefined, title: string) {
		const label = await promptDialog({
			text: m.guideTreeEntryLabelPrompt({ page: title }),
			initialValue: current ?? '',
			confirmLabel: m.save()
		});
		if (label === null) return;
		draft.change(
			updateEntry({ outline, at, change: (e) => ({ ...e, label: label.trim() || undefined }) })
		);
	}

	function entryItems(at: EntryAt, label: string | undefined, title: string): TreeMenuItem[] {
		const others = outline.sections.flatMap((other, target) =>
			target === index
				? []
				: [
						{
							label: other.title,
							indent: true,
							onSelect: () =>
								draft.change(
									moveEntry({
										outline,
										from: at,
										to: { section: target, entry: other.entries.length }
									})
								)
						}
					]
		);
		return [
			{
				label: m.guideMoveUp(),
				icon: 'ph-arrow-up',
				disabled: at.entry === 0,
				onSelect: () =>
					draft.change(
						moveEntry({ outline, from: at, to: { section: index, entry: at.entry - 1 } })
					)
			},
			{
				label: m.guideMoveDown(),
				icon: 'ph-arrow-down',
				disabled: at.entry === section.entries.length - 1,
				onSelect: () =>
					draft.change(
						moveEntry({ outline, from: at, to: { section: index, entry: at.entry + 1 } })
					)
			},
			...(others.length > 0 ? [{ label: m.guideTreeMoveTo() }, ...others] : []),
			...(outline.committeeTemplate
				? [
						{
							label: m.guideTreeMoveToTemplate(),
							icon: 'ph-users-three',
							onSelect: () =>
								draft.change(
									dropInTree({
										outline,
										drag: { type: 'entry', at },
										drop: { type: 'templateEnd' }
									})
								)
						}
					]
				: []),
			{
				label: m.guideTreeEntryLabel(),
				icon: 'ph-text-aa',
				onSelect: () => relabel(at, label, title)
			},
			{
				label: m.guideRemoveEntry(),
				icon: 'ph-x',
				danger: true,
				onSelect: () => draft.change(removeEntry({ outline, at }))
			}
		];
	}

	const headingItems = $derived<TreeMenuItem[]>([
		{ label: m.guideTreeRename(), icon: 'ph-pencil-simple', onSelect: rename },
		{ label: m.guideAudience(), icon: 'ph-eye', onSelect: () => (editingAudience = true) },
		...blockMoveItems({ outline, block, blocks, change: draft.change }),
		{ label: m.guideRemoveSection(), icon: 'ph-trash', danger: true, onSelect: remove }
	]);
</script>

<section class="flex flex-col" aria-label={section.title} data-testid="guide-tree-section">
	<TreeHeading
		title={section.title}
		note={audienceLabel({ audience: section.audience, roles: tree.roles })}
		{block}
		items={headingItems}
	/>
	<ul class="flex flex-col">
		{#each section.entries as entry, entryIndex (entryIndex)}
			{@const page = tree.pageOf(entry.pageId)}
			{@const at = { section: index, entry: entryIndex }}
			<TreeRow
				title={entry.label || page?.title || m.guidePageMissing()}
				href={page ? tree.hrefOf(entry.pageId) : undefined}
				state={page?.state}
				active={tree.activePageId === entry.pageId}
				note={entry.audience
					? audienceLabel({ audience: entry.audience, roles: tree.roles })
					: undefined}
				drag={{ type: 'entry', at }}
				drop={{ type: 'entry', at }}
				dropKey="{section.id}-{entryIndex}"
				items={entryItems(at, entry.label, page?.title ?? '')}
			/>
		{/each}
		<li
			class={['border-t-2 border-transparent', drag.isOver(endKey) && 'border-t-primary']}
			ondragover={(event) => drag.enter({ key: endKey, accepts: !drag.holdsBlock(), event })}
			ondragleave={() => drag.leave(endKey)}
			ondrop={(event) => drag.drop({ drop: { type: 'sectionEnd', section: index }, event })}
		>
			<AddPageMenu
				pages={tree.addable}
				label={m.guideAddEntry()}
				onPick={(pageId) => draft.change(addEntry({ outline, section: index, pageId }))}
				onCreate={() => tree.createPage({ type: 'section', section: index })}
			/>
		</li>
	</ul>
</section>

<AudienceModal
	bind:open={editingAudience}
	title={section.title}
	value={section.audience}
	roles={tree.roles}
	onChange={(audience) =>
		draft.change(updateSection({ outline, index, change: (s) => ({ ...s, audience }) }))}
/>
