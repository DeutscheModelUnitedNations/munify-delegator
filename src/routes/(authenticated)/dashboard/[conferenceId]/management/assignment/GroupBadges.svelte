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

<!-- An icon with what it means, shown on hover (and read out by screen readers). -->
{#snippet marked(tip: string, icon: string, badge: boolean)}
	<span class="tooltip tooltip-right before:max-w-60 before:whitespace-pre-line" data-tip={tip}>
		{#if badge}
			<span class="badge badge-xs badge-info" role="img" aria-label={tip}>
				<i class="fa-solid {icon}"></i>
			</span>
		{:else}
			<i class="fa-duotone {icon}" role="img" aria-label={tip}></i>
		{/if}
	</span>
{/snippet}

<div class="flex flex-wrap items-center gap-1">
	{#if group.part}
		{@render marked(m.assignmentSplitPart(), 'fa-split', true)}
	{/if}
	{#if group.singleParticipantId}
		{@render marked(m.assignmentConvertedSingle(), 'fa-user-plus', true)}
	{/if}
	{#if review?.flagged}
		{@render marked(m.assignmentFlag(), 'fa-flag text-warning', false)}
	{/if}
	{#if review?.note}
		{@render marked(review.note, 'fa-note-sticky text-info', false)}
	{/if}
</div>
