<script lang="ts">
	import type { BoardReviewRow } from '$lib/assignment/board';
	import type { AssignmentGroup } from '$lib/assignment/state';
	import { m } from '$lib/paraglide/messages';

	/** What sets a group apart on its card: how it came about, the team's marks, its wish. */
	interface Props {
		group: AssignmentGroup;
		review: BoardReviewRow | undefined;
		/** The rank the group gave its role; only shown for a delegation with a role. */
		wish: { rank: number | undefined } | undefined;
	}

	let { group, review, wish }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-1">
	{#if group.part}
		<span class="badge badge-xs badge-info" title={m.assignmentSplitPart()}>
			<i class="fa-solid fa-split"></i>
		</span>
	{/if}
	{#if group.singleParticipantId}
		<span class="badge badge-xs badge-info" title={m.assignmentConvertedSingle()}>
			<i class="fa-solid fa-user-plus"></i>
		</span>
	{/if}
	{#if review?.flagged}
		<i class="fa-duotone fa-flag text-warning" title={m.assignmentFlag()}></i>
	{/if}
	{#if review?.note}
		<i class="fa-duotone fa-note-sticky text-info" title={review.note}></i>
	{/if}
	{#if wish?.rank !== undefined}
		<span class="badge badge-xs badge-success">{m.assignmentWishRank({ rank: wish.rank })}</span>
	{:else if wish}
		<span class="badge badge-xs badge-warning">{m.assignmentNoWish()}</span>
	{/if}
	{#if group.pending}
		<i class="fa-duotone fa-pen-ruler text-primary" title={m.assignmentPendingChange()}></i>
	{/if}
</div>
