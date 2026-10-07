<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';
	import type { DragDropState } from '@thisux/sveltednd';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { BoardDelegation } from './board';
	import { evenDivisions, initialParts, partsOf, quickSplit, withoutPart } from './split';
	import SplitPart from './SplitPart.svelte';

	/** Splits a delegation into parts that are assigned on their own, by picking a part per member. */
	interface Props {
		delegation: BoardDelegation;
		onClose: () => void;
	}

	let { delegation, onClose }: Props = $props();

	// Seeded once: the members are fixed while the modal is open.
	const members = untrack(() => delegation.members);
	const memberIds = members.map((member) => member.id);
	let partOf = $state(initialParts(memberIds));
	let partCount = $state(2);
	let saving = $state(false);
	let draggedId = $state<string | undefined>();

	const binContainer = (part: number) => `split-part-${part}`;

	function onDrop(dropState: DragDropState<{ id: string }>) {
		draggedId = undefined;
		const part = parts.findIndex((_, index) => binContainer(index) === dropState.targetContainer);
		if (part >= 0) partOf[dropState.draggedItem.id] = part;
	}

	const divisions = evenDivisions(members.length);

	function splitEvenly(count: number) {
		partCount = count;
		partOf = quickSplit(memberIds, count);
	}

	function removePart(removed: number) {
		partOf = withoutPart(partOf, removed);
		partCount--;
	}

	const parts = $derived(partsOf(members, partOf, partCount));
	const filledParts = $derived(parts.filter((part) => part.length > 0));
	const valid = $derived(filledParts.length >= 2);

	async function split() {
		saving = true;
		try {
			await client.mutate.splitDelegation({
				__args: {
					delegationId: delegation.id,
					parts: filledParts.map((part) => ({ memberIds: part.map((member) => member.id) }))
				}
			});
			onClose();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			saving = false;
		}
	}
</script>

<ActionModal
	title={m.assignmentSplitTitle({ name: codenamize(delegation.id) })}
	boxClass="w-11/12 max-w-5xl"
	confirmLabel={m.assignmentSplit()}
	confirmDisabled={!valid}
	loading={saving}
	onConfirm={split}
	{onClose}
>
	{#snippet footer()}
		{#if divisions.length > 0}
			<div class="flex items-center gap-2">
				{#each divisions as count (count)}
					<button
						class="border-primary/60 text-primary hover:bg-primary/10 hover:border-primary flex size-10 cursor-pointer items-center justify-center gap-0.5 rounded-full border-2 border-dashed text-sm font-bold transition-colors"
						title={m.assignmentQuickSplitTitle({ count, size: members.length / count })}
						onclick={() => splitEvenly(count)}
					>
						<i class="fa-solid fa-divide text-xs"></i>{count}
					</button>
				{/each}
			</div>
		{/if}
	{/snippet}
	<p class="text-base-content/70 text-sm">{m.assignmentSplitDescription()}</p>
	<p class="text-base-content/50 text-xs">{m.assignmentSplitDragHint()}</p>
	<div class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
		{#each parts as part, index (index)}
			<SplitPart
				{index}
				members={part}
				container={binContainer(index)}
				{draggedId}
				{onDrop}
				onDragChange={(memberId) => (draggedId = memberId)}
				onRemove={partCount > 2 ? () => removePart(index) : undefined}
			/>
		{/each}
		{#if partCount < members.length}
			<button
				class="border-base-content/30 text-base-content/60 hover:border-primary hover:text-primary hover:bg-primary/5 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors"
				onclick={() => partCount++}
			>
				<i class="fa-duotone fa-plus text-2xl"></i>
				<span class="text-sm font-semibold">{m.assignmentAddPart()}</span>
			</button>
		{/if}
	</div>
</ActionModal>
