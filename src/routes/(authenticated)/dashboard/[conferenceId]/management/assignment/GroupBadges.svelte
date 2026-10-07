<script lang="ts">
	import type { BoardReviewRow } from '$lib/assignment/board';
	import type { AssignmentGroup } from '$lib/assignment/state';
	import { m } from '$lib/paraglide/messages';

	/** What sets a group apart on its card: how it came about, the team's marks, its wish. */
	interface Props {
		group: AssignmentGroup;
		review: BoardReviewRow | undefined;
	}

	let { group, review }: Props = $props();
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
</div>
