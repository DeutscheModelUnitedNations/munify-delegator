<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog, promptDialog } from '#lib/state/dialogs.svelte.js';
	import type { CommitteeTemplate, TemplateSlot } from '#lib/guide/outline';
	import { dropInTree, moveItem, setTemplateEnabled, updateSlots } from '#lib/guide/outlineEditing';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import type { ResolvedPathname } from '$app/types';
	import AddPageMenu from './AddPageMenu.svelte';
	import { blockMoveItems } from './blockItems';
	import { slotView } from './slotView';
	import CommitteeChips from './CommitteeChips.svelte';
	import TreeHeading from './TreeHeading.svelte';
	import TreeRow from './TreeRow.svelte';
	import type { TreeMenuItem } from './treeMenu';
	import { getTreeContext } from './treeContext';
	import { getTreeDrag } from './treeDrag.svelte';

	/**
	 * The committee template in the tree: the entries every committee's section gets, with the
	 * committee's page and its agenda items' pages as placeholders, and each committee's progress.
	 */
	interface Props {
		template: CommitteeTemplate;
		block: number;
		blocks: number;
		committees: readonly { id: string; abbreviation: string; published: number; total: number }[];
		committeesHref: ResolvedPathname;
	}

	let { template, block, blocks, committees, committeesHref }: Props = $props();

	const draft = getOutlineDraft();
	const tree = getTreeContext();
	const drag = getTreeDrag();
	const outline = $derived(draft.outline);

	const setSlots = (change: (slots: TemplateSlot[]) => TemplateSlot[]) =>
		draft.change(updateSlots({ outline, change }));

	const PLACEHOLDER: Record<'committeePage' | 'agendaItemPages', () => string> = {
		committeePage: () => m.guideSlotCommitteePage(),
		agendaItemPages: () => m.guideSlotAgendaItemPages()
	};

	async function relabel(index: number, slot: TemplateSlot, title: string) {
		if (slot.type === 'agendaItemPages') return;
		const label = await promptDialog({
			text: m.guideTreeEntryLabelPrompt({ page: title }),
			initialValue: slot.label ?? '',
			confirmLabel: m.save()
		});
		if (label === null) return;
		setSlots((slots) =>
			slots.map((s, at) =>
				at === index && s.type !== 'agendaItemPages'
					? { ...s, label: label.trim() || undefined }
					: s
			)
		);
	}

	function slotItems(index: number, slot: TemplateSlot, title: string): TreeMenuItem[] {
		const sections =
			slot.type === 'page'
				? outline.sections.map((section, target) => ({
						label: section.title,
						indent: true,
						onSelect: () =>
							draft.change(
								dropInTree({
									outline,
									drag: { type: 'slot', index },
									drop: { type: 'sectionEnd', section: target }
								})
							)
					}))
				: [];
		return [
			{
				label: m.guideMoveUp(),
				icon: 'ph-arrow-up',
				disabled: index === 0,
				onSelect: () => setSlots((slots) => moveItem({ list: slots, index, by: -1 }))
			},
			{
				label: m.guideMoveDown(),
				icon: 'ph-arrow-down',
				disabled: index === template.slots.length - 1,
				onSelect: () => setSlots((slots) => moveItem({ list: slots, index, by: 1 }))
			},
			...(sections.length > 0 ? [{ label: m.guideTreeMoveTo() }, ...sections] : []),
			...(slot.type === 'agendaItemPages'
				? []
				: [
						{
							label: m.guideTreeEntryLabel(),
							icon: 'ph-text-aa',
							onSelect: () => relabel(index, slot, title)
						}
					]),
			{
				label: m.guideRemoveEntry(),
				icon: 'ph-x',
				danger: true,
				onSelect: () => setSlots((slots) => slots.filter((_, at) => at !== index))
			}
		];
	}

	const SLOT_TEXTS = {
		missing: m.guidePageMissing(),
		committeePage: m.guideSlotCommitteePage(),
		agendaItemPages: m.guideSlotAgendaItemPages()
	};

	async function removeTemplate() {
		if (!(await confirmDialog({ text: m.guideTreeRemoveTemplateConfirm(), danger: true }))) return;
		draft.change(setTemplateEnabled({ outline, enabled: false }));
	}

	const missingPlaceholders = $derived(
		(['committeePage', 'agendaItemPages'] as const).filter(
			(type) => !template.slots.some((slot) => slot.type === type)
		)
	);

	const headingItems = $derived<TreeMenuItem[]>([
		...blockMoveItems({ outline, block, blocks, change: draft.change }),
		...missingPlaceholders.map((type) => ({
			label: m.guideTreeAddPlaceholder({ placeholder: PLACEHOLDER[type]() }),
			icon: 'ph-plus',
			onSelect: () => setSlots((slots) => [...slots, { type }])
		})),
		{ label: m.guideTreeRemoveTemplate(), icon: 'ph-trash', danger: true, onSelect: removeTemplate }
	]);
</script>

<section
	class="border-base-content/40 bg-base-100/60 mt-2 flex flex-col rounded-sm border border-dashed px-1 pb-1"
	aria-label={m.guideCommitteeTemplate()}
	data-testid="guide-tree-template"
>
	<TreeHeading
		title={m.guideCommitteeTemplate()}
		note={m.guideTreeTemplateRepeats({ count: committees.length })}
		icon="ph-users-three"
		{block}
		items={headingItems}
	/>
	<ul class="flex flex-col">
		{#each template.slots as slot, index (index)}
			{@const view = slotView({ slot, pageOf: tree.pageOf, texts: SLOT_TEXTS })}
			<TreeRow
				title={view.title}
				href={view.page ? tree.hrefOf(view.page.id) : undefined}
				state={view.page?.state}
				active={!!view.page && tree.activePageId === view.page.id}
				indent={slot.type === 'agendaItemPages'}
				drag={{ type: 'slot', index }}
				drop={{ type: 'slot', index }}
				dropKey="slot-{index}"
				items={slotItems(index, slot, view.page?.title ?? view.title)}
			/>
		{/each}
		<li
			class={['border-t-2 border-transparent', drag.isOver('template-end') && 'border-t-primary']}
			ondragover={(event) =>
				drag.enter({ key: 'template-end', accepts: !drag.holdsBlock(), event })}
			ondragleave={() => drag.leave('template-end')}
			ondrop={(event) => drag.drop({ drop: { type: 'templateEnd' }, event })}
		>
			<AddPageMenu
				pages={tree.addable}
				label={m.guideAddEntry()}
				onPick={(pageId) => setSlots((slots) => [...slots, { type: 'page', pageId }])}
				onCreate={() => tree.createPage({ type: 'template' })}
			/>
		</li>
	</ul>
	{#if committees.length > 0}
		<CommitteeChips {committees} href={committeesHref} />
	{/if}
</section>
