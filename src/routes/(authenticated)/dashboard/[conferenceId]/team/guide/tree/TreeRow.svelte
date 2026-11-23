<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { GuidePageState } from '#lib/guide/library';
	import type { TreeDrag, TreeDrop } from '#lib/guide/outlineEditing';
	import StateDot from './StateDot.svelte';
	import TreeMenu from './TreeMenu.svelte';
	import type { TreeMenuItem } from './treeMenu';
	import { getTreeDrag } from './treeDrag.svelte';

	/**
	 * A row of the guide tree: a page (with its state, opening the editor) or a template
	 * placeholder. Dragged to move it; another row dropped on it lands before it.
	 */
	interface Props {
		title: string;
		/** The editor; placeholders have none. */
		href?: ResolvedPathname;
		state?: GuidePageState;
		active?: boolean;
		indent?: boolean;
		/** A short note after the title (who sees the entry). */
		note?: string;
		drag: TreeDrag;
		drop?: TreeDrop;
		dropKey: string;
		items: readonly TreeMenuItem[];
	}

	let {
		title,
		href,
		state,
		active = false,
		indent = false,
		note,
		drag,
		drop,
		dropKey,
		items
	}: Props = $props();

	const tree = getTreeDrag();
	const accepts = $derived(!!drop && !tree.holdsBlock());
</script>

<li
	class={[
		'flex items-center gap-1 rounded-sm border-t-2 border-transparent pe-1',
		tree.isOver(dropKey) && 'border-t-primary',
		active && 'bg-base-100 border-s-primary border-s-4 font-semibold',
		indent && 'ps-4'
	]}
	draggable="true"
	ondragstart={(event) => tree.start({ drag, event })}
	ondragend={() => tree.end()}
	ondragover={(event) => tree.enter({ key: dropKey, accepts, event })}
	ondragleave={() => tree.leave(dropKey)}
	ondrop={(event) => drop && tree.drop({ drop, event })}
	data-testid="guide-tree-row"
>
	<i class="ph-duotone ph-dots-six-vertical shrink-0 cursor-grab opacity-40" aria-hidden="true"></i>
	{#if href}
		<a
			{href}
			class="hover:bg-base-100 flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-sm px-1 text-sm"
			aria-current={active ? 'page' : undefined}
		>
			{#if state}<StateDot {state} />{/if}
			<span class="min-w-0 flex-1 truncate">{title}</span>
			{#if note}<span class="badge badge-ghost badge-xs shrink-0">{note}</span>{/if}
		</a>
	{:else}
		<span class="flex min-h-9 min-w-0 flex-1 items-center gap-2 px-1 text-sm italic opacity-80">
			<i class="ph-duotone ph-brackets-curly shrink-0" aria-hidden="true"></i>
			<span class="min-w-0 flex-1 truncate">{title}</span>
		</span>
	{/if}
	<TreeMenu {items} />
</li>
