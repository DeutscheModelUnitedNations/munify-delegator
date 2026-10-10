<script lang="ts">
	import { CONVERT_CONTAINER } from '$lib/assignment/board';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import type { BoardSingleParticipant } from '../board';

	/** Drop zone turning single participants into delegations, listing those already planned. */
	interface Props {
		converted: { singleParticipantId: string; single: BoardSingleParticipant | undefined }[];
		highlight: boolean;
		/** Whether the conversion of a participant is being taken back right now. */
		reverting: (singleParticipantId: string) => boolean;
		onDrop: (state: DragDropState<{ id: string }>) => void;
		onRevert: (singleParticipantId: string) => void;
	}

	let { converted, highlight, reverting, onDrop, onRevert }: Props = $props();
</script>

<section
	class="flex max-h-[40%] min-h-24 shrink-0 flex-col gap-2 overflow-y-auto rounded-box border-2 border-dashed p-3 transition-colors
		{highlight ? 'border-primary bg-primary/10' : 'border-base-300'}"
	aria-label={m.assignmentConvertToDelegation()}
	use:droppable={{ container: CONVERT_CONTAINER, callbacks: { onDrop } }}
>
	<h3 class="font-bold">
		<i class="fa-sharp-duotone fa-solid fa-user-plus"></i>
		{m.assignmentConvertToDelegation()}
	</h3>
	<p class="text-base-content/60 text-xs">{m.assignmentConvertHint()}</p>
	<ul class="flex flex-col gap-1">
		{#each converted as { singleParticipantId, single } (singleParticipantId)}
			<li class="flex items-center justify-between gap-2 text-sm">
				{#if single}
					<span>{formatNames(single.user.givenName, single.user.familyName)}</span>
				{/if}
				<button
					class="btn btn-ghost btn-xs"
					disabled={reverting(singleParticipantId)}
					onclick={() => onRevert(singleParticipantId)}
				>
					{#if reverting(singleParticipantId)}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
					{/if}
					{m.assignmentRevertConversion()}
				</button>
			</li>
		{/each}
	</ul>
</section>
