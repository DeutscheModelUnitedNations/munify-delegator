<script lang="ts">
	import { canSplit, cardBorder, wishStatus } from '$lib/assignment/board';
	import { targetKey, type AssignmentGroup } from '$lib/assignment/state';
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { draggable } from '@thisux/sveltednd';
	import type { BoardDelegation, BoardReview, BoardSingleParticipant } from './board';
	import GroupActions from './GroupActions.svelte';
	import GroupBadges from './GroupBadges.svelte';

	/**
	 * One group on the board: a delegation, a part of a split one, or a single participant turned
	 * into a delegation. Dragged by its key out of `container`.
	 */
	interface Props {
		group: AssignmentGroup;
		delegation: BoardDelegation | undefined;
		single: BoardSingleParticipant | undefined;
		review: BoardReview | undefined;
		container: string;
		onDragChange?: (dragging: boolean) => void;
		onSplit?: () => void;
		onUndoSplit?: () => void;
		onUnassign?: () => void;
	}

	let {
		group,
		delegation,
		single,
		review,
		container,
		onDragChange,
		onSplit,
		onUndoSplit,
		onUnassign
	}: Props = $props();

	const people = $derived(
		single
			? [single.user]
			: (delegation?.members ?? [])
					.filter((member) => group.memberIds.includes(member.id))
					.map((member) => member.user)
	);
	const names = $derived(
		people.map((user) => formatNames(user.givenName, user.familyName)).join(', ')
	);
	const assigned = $derived(!!targetKey(group.target));
	// Only a delegation has wishes to compare its role with.
	const wish = $derived(wishStatus(delegation?.appliedForRoles, group.target));
	/** The buttons that apply to this group. */
	const actions = $derived({
		onSplit: canSplit(group) ? onSplit : undefined,
		onUndoSplit: group.part ? onUndoSplit : undefined,
		onUnassign: assigned ? onUnassign : undefined
	});
	const codename = $derived(
		codenamize(group.delegationId ?? group.singleParticipantId ?? group.key)
	);
</script>

<div
	role="listitem"
	use:draggable={{ container, dragData: { id: group.key } }}
	ondragstart={() => onDragChange?.(true)}
	ondragend={() => onDragChange?.(false)}
	class="bg-base-100 flex w-44 cursor-grab flex-col gap-1 rounded-lg border p-2 text-xs shadow-sm {cardBorder(
		review,
		group.pending
	)}"
	title={names}
>
	<div class="flex items-center justify-between gap-1">
		<span class="truncate font-bold">{codename}</span>
		<span class="badge badge-xs badge-neutral shrink-0">
			<i class="fa-solid fa-users"></i>
			{group.size}
		</span>
	</div>
	{#if review?.evaluation != null}
		<StarRating rating={review.evaluation} size="xs" />
	{:else}
		<span class="text-base-content/50">{m.assignmentUnrated()}</span>
	{/if}
	<GroupBadges {group} {review} {wish} />
	<GroupActions {...actions} />
</div>
