<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import type { BoardDelegation } from './board';

	/** One part in the split modal: a bin its members are dragged into and out of. */
	interface Props {
		index: number;
		members: BoardDelegation['members'];
		container: string;
		/** The member being dragged, if any, shown faded. */
		draggedId: string | undefined;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		onDragChange: (memberId: string | undefined) => void;
		/** Present while the part may be removed. */
		onRemove?: () => void;
	}

	let { index, members, container, draggedId, onDrop, onDragChange, onRemove }: Props = $props();

	const filled = $derived(members.length > 0);
</script>

<div
	role="list"
	aria-label={m.assignmentPart({ number: index + 1 })}
	use:droppable={{ container, callbacks: { onDrop } }}
	class="flex min-h-32 flex-col gap-2 rounded-lg border p-2 transition-colors {filled
		? 'border-primary/50 bg-primary/5'
		: 'border-base-300 bg-base-200'}"
>
	<div class="flex items-center gap-2 text-sm font-bold">
		<span class="mr-auto">{m.assignmentPart({ number: index + 1 })}</span>
		<span class="badge badge-sm {filled ? 'badge-primary' : 'badge-ghost'}">
			<i class="fa-duotone fa-users"></i>
			{members.length}
		</span>
		{#if onRemove}
			<button
				class="btn btn-ghost btn-xs btn-square"
				title={m.assignmentRemovePart()}
				aria-label={m.assignmentRemovePart()}
				onclick={onRemove}
			>
				<i class="fa-duotone fa-xmark"></i>
			</button>
		{/if}
	</div>
	{#each members as member (member.id)}
		<div
			role="listitem"
			use:draggable={{ container, dragData: { id: member.id } }}
			ondragstart={() => onDragChange(member.id)}
			ondragend={() => onDragChange(undefined)}
			class="bg-base-100 border-base-300 flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2.5 text-base shadow-sm {draggedId ===
			member.id
				? 'opacity-50'
				: ''}"
		>
			<span class="truncate">
				{formatNames(member.user.givenName ?? undefined, member.user.familyName ?? undefined)}
			</span>
			{#if member.isHeadDelegate}
				<i class="fa-duotone fa-crown text-warning shrink-0" title={m.headDelegate()}></i>
			{/if}
		</div>
	{:else}
		<div
			class="border-base-content/30 text-base-content/50 flex grow items-center justify-center rounded-md border-2 border-dashed p-2 text-center text-xs"
		>
			{m.assignmentPartEmpty()}
		</div>
	{/each}
</div>
