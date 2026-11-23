<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { outlinePageIds } from '#lib/guide/outline';
	import {
		addEntry,
		addSection,
		dropInTree,
		outlineBlocks,
		placePage,
		setTemplateEnabled,
		type PageTarget
	} from '#lib/guide/outlineEditing';
	import {
		committeeMatrix,
		committeeProgress,
		outlineChanged,
		pagesOutsideOutline,
		pendingPages
	} from '#lib/guide/workspace';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import { fetchWorkspace, toWorkspace } from '../workspaceData';
	import NewPageModal from './NewPageModal.svelte';
	import PublishChanges from './PublishChanges.svelte';
	import TreeRow from './TreeRow.svelte';
	import TreeSection from './TreeSection.svelte';
	import TreeTemplate from './TreeTemplate.svelte';
	import { setTreeContext } from './treeContext';
	import { createTreeDrag, setTreeDrag } from './treeDrag.svelte';

	/**
	 * The guide as a tree: its sections and the committee template in sidebar order, the pages not
	 * in it, and publishing what changed. Pages open in the editor beside it.
	 */
	interface Props {
		conferenceId: string;
		activePageId: string | undefined;
	}

	let { conferenceId, activePageId }: Props = $props();

	const draft = getOutlineDraft();

	// The contexts are set before the first `await` (Svelte allows it only then); their getters
	// read what is fetched below.
	const hrefOf = (pageId: string) =>
		resolve('/(authenticated)/dashboard/[conferenceId]/team/guide/page/[pageId]', {
			conferenceId,
			pageId
		});
	const committeesHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/guide/committees', { conferenceId })
	);

	let newPageTarget = $state<PageTarget>(null);
	let creating = $state(false);

	setTreeContext({
		pageOf: (pageId) => byId.get(pageId),
		get addable() {
			return addable;
		},
		hrefOf,
		get activePageId() {
			return activePageId;
		},
		get roles() {
			return roles;
		},
		createPage: (target) => {
			newPageTarget = target;
			creating = true;
		}
	});

	setTreeDrag(
		createTreeDrag(({ drag, drop }) =>
			draft.change(dropInTree({ outline: draft.outline, drag, drop }))
		)
	);

	const [workspace, stored] = $derived(
		await Promise.all([
			fetchWorkspace(conferenceId),
			client.liveQuery.guideOutlineOf({ __args: { conferenceId }, published: true })
		])
	);

	const { pages, committees, roles } = $derived(toWorkspace(workspace));
	const outline = $derived(draft.outline);
	const blocks = $derived(outlineBlocks(outline));
	const locale = getLocale();

	const byId = $derived(new Map(pages.map((page) => [page.id, page])));
	const named = $derived(new Set(outlinePageIds(outline)));
	const addable = $derived(
		pages
			.filter((page) => page.kind === 'GENERAL')
			.map((page) => ({ ...page, inGuide: named.has(page.id) }))
			.toSorted((a, b) => a.title.localeCompare(b.title, locale))
	);
	const outside = $derived(pagesOutsideOutline({ outline, pages, locale }));
	const pending = $derived(pendingPages({ outline, pages, locale }));
	const sidebarChanged = $derived(outlineChanged({ draft: outline, published: stored?.published }));

	const committeeStatus = $derived.by(() => {
		const rows = committeeMatrix({ slots: outline.committeeTemplate?.slots, committees, pages });
		const progress = committeeProgress(rows, committees.length);
		return committees.map((committee, index) => ({
			id: committee.id,
			abbreviation: committee.abbreviation,
			...progress[index]
		}));
	});

	async function created(pageId: string) {
		draft.change(placePage({ outline, target: newPageTarget, pageId }));
		newPageTarget = null;
		await goto(hrefOf(pageId));
	}

	function bin(pageId: string) {
		return [
			{ label: m.guideTreeAddTo() },
			...outline.sections.map((section, index) => ({
				label: section.title,
				indent: true,
				onSelect: () => draft.change(addEntry({ outline, section: index, pageId }))
			})),
			...(outline.committeeTemplate
				? [
						{
							label: m.guideCommitteeTemplate(),
							indent: true,
							onSelect: () =>
								draft.change(placePage({ outline, target: { type: 'template' }, pageId }))
						}
					]
				: [])
		];
	}
</script>

<nav
	class="bg-base-200 rounded-box flex flex-col p-2"
	aria-label={m.guideTreeLabel()}
	data-tour="team.guide.tree"
	data-testid="guide-tree"
>
	<div class="flex items-center gap-2 px-1">
		<span class="text-sm font-semibold">{m.guideTreeLabel()}</span>
		<span class="ml-auto text-xs opacity-70" aria-live="polite">
			{draft.busy ? m.guideTreeSaving() : m.guideTreeSaved()}
		</span>
		<button
			class="btn btn-primary btn-xs"
			onclick={() => {
				newPageTarget = null;
				creating = true;
			}}
			data-tour="team.guide.new"
		>
			<i class="ph-duotone ph-plus" aria-hidden="true"></i>
			{m.guideNewPage()}
		</button>
	</div>

	{#if blocks.length === 0}
		<p class="p-2 text-sm opacity-70">{m.guideSidebarEmpty()}</p>
	{/if}
	{#each blocks as block, index (block.kind === 'section' ? outline.sections[block.index].id : 'template')}
		{#if block.kind === 'section'}
			<TreeSection
				section={outline.sections[block.index]}
				index={block.index}
				block={index}
				blocks={blocks.length}
			/>
		{:else if outline.committeeTemplate}
			<TreeTemplate
				template={outline.committeeTemplate}
				block={index}
				blocks={blocks.length}
				committees={committeeStatus}
				{committeesHref}
			/>
		{/if}
	{/each}

	<div class="flex flex-wrap gap-1 pt-3">
		<button
			class="btn btn-ghost btn-xs"
			onclick={() => draft.change(addSection({ outline, title: m.guideNewSection() }))}
		>
			<i class="ph-duotone ph-plus" aria-hidden="true"></i>
			{m.guideAddSection()}
		</button>
		{#if !outline.committeeTemplate}
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => draft.change(setTemplateEnabled({ outline, enabled: true }))}
			>
				<i class="ph-duotone ph-users-three" aria-hidden="true"></i>
				{m.guideTreeAddTemplate()}
			</button>
		{/if}
	</div>

	{#if outside.length > 0}
		<details class="border-base-300 mt-3 border-t pt-2" open data-testid="guide-tree-outside">
			<summary class="cursor-pointer px-1 text-xs font-bold tracking-wider uppercase opacity-80">
				{m.guideTreeOutside({ count: outside.length })}
			</summary>
			<p class="px-1 py-1 text-xs opacity-70">{m.guideTreeOutsideHint()}</p>
			<ul class="flex flex-col">
				{#each outside as page (page.id)}
					<TreeRow
						title={page.title}
						href={hrefOf(page.id)}
						state={page.state}
						active={activePageId === page.id}
						drag={{ type: 'page', pageId: page.id }}
						dropKey="outside-{page.id}"
						items={bin(page.id)}
					/>
				{/each}
			</ul>
		</details>
	{/if}

	<PublishChanges {conferenceId} pages={pending} {sidebarChanged} />
</nav>

{#if creating}
	<NewPageModal bind:open={creating} {conferenceId} onCreated={created} />
{/if}
