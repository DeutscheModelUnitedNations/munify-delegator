<script lang="ts">
	import TreeMenu from './TreeMenu.svelte';
	import type { TreeMenuItem } from './treeMenu';
	import { getTreeDrag } from './treeDrag.svelte';

	/** The heading of a block of the tree (a section, the template): dragged to move the block. */
	interface Props {
		title: string;
		/** Who sees it, or what it repeats for. */
		note: string;
		block: number;
		items: readonly TreeMenuItem[];
		icon?: string;
	}

	let { title, note, block, items, icon }: Props = $props();

	const drag = getTreeDrag();
	const key = $derived(`block-${block}`);
</script>

<div
	class={[
		'flex items-center gap-1 border-t-2 border-transparent pt-3 pe-1',
		drag.isOver(key) && 'border-t-primary'
	]}
	role="group"
	draggable="true"
	ondragstart={(event) => drag.start({ drag: { type: 'block', index: block }, event })}
	ondragend={() => drag.end()}
	ondragover={(event) => drag.enter({ key, accepts: drag.holdsBlock(), event })}
	ondragleave={() => drag.leave(key)}
	ondrop={(event) => drag.drop({ drop: { type: 'block', index: block }, event })}
>
	<i class="ph-duotone ph-dots-six-vertical shrink-0 cursor-grab opacity-40" aria-hidden="true"></i>
	{#if icon}<i class="ph-duotone {icon} shrink-0" aria-hidden="true"></i>{/if}
	<h3 class="min-w-0 flex-1 truncate text-xs font-bold tracking-wider uppercase opacity-80">
		{title}
	</h3>
	<span class="badge badge-outline badge-xs shrink-0">{note}</span>
	<TreeMenu {items} />
</div>
