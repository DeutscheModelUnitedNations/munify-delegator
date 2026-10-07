<script lang="ts">
	import { cardBorder, type BoardReviewRow } from '$lib/assignment/board';
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { draggable } from '@thisux/sveltednd';
	import type { BoardSingleParticipant } from '../board';

	/** A single participant on the board, dragged by their id out of `container`. */
	interface Props {
		singleParticipantId: string;
		single: BoardSingleParticipant | undefined;
		review: BoardReviewRow | undefined;
		pending: boolean;
		container: string;
		onDragChange: (dragging: boolean) => void;
	}

	let { singleParticipantId, single, review, pending, container, onDragChange }: Props = $props();

	const wishes = $derived(single?.appliedForRoles.map((role) => role.name).join(', ') ?? '');
</script>

<div
	role="listitem"
	use:draggable={{ container, dragData: { id: singleParticipantId } }}
	ondragstart={() => onDragChange(true)}
	ondragend={() => onDragChange(false)}
	class="bg-base-100 flex w-44 cursor-grab flex-col gap-1 rounded-lg border p-2 text-xs shadow-sm {cardBorder(
		review,
		pending
	)}"
>
	<span class="truncate font-bold">{codenamize(singleParticipantId)}</span>
	{#if single}
		<span class="truncate">{formatNames(single.user.givenName, single.user.familyName)}</span>
	{/if}
	{#if wishes}
		<span class="text-base-content/60 truncate">{wishes}</span>
	{/if}
	<div class="flex items-center gap-1">
		{#if review?.evaluation != null}
			<StarRating rating={review.evaluation} size="xs" />
		{/if}
		{#if review?.flagged}
			<i class="fa-duotone fa-flag text-warning"></i>
		{/if}
		{#if pending}
			<i class="fa-duotone fa-pen-ruler text-primary" title={m.assignmentPendingChange()}></i>
		{/if}
	</div>
</div>
