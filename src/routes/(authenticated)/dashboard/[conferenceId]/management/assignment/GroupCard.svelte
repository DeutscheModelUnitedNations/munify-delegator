<script lang="ts">
	import BusyOverlay from './BusyOverlay.svelte';
	import {
		canSplit,
		cardBorder,
		wishList,
		wishStatus,
		type BoardReviewRow
	} from '$lib/assignment/board';
	import type { AssignmentGroup } from '$lib/assignment/state';
	import StarRating from '$lib/components/StarRating.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { draggable } from '@thisux/sveltednd';
	import type { BoardDelegation, BoardSingleParticipant } from './board';
	import GroupActions from './GroupActions.svelte';
	import GroupBadges from './GroupBadges.svelte';
	import { sightingHref } from './sightingLink';

	/**
	 * One group on the board: a delegation, a part of a split one, or a single participant turned
	 * into a delegation. Dragged by its key out of `container`.
	 */
	interface Props {
		group: AssignmentGroup;
		delegation: BoardDelegation | undefined;
		single: BoardSingleParticipant | undefined;
		review: BoardReviewRow | undefined;
		container: string;
		conferenceId: string;
		onDragChange?: (dragging: boolean) => void;
		onSplit?: () => void;
		onUndoSplit?: () => void;
		/** Fill the width of the container instead of the fixed card width. */
		fluid?: boolean;
		/** A change to the card is on its way: it shows a spinner and cannot be dragged. */
		busy?: boolean;
	}

	let {
		group,
		delegation,
		single,
		review,
		container,
		conferenceId,
		onDragChange,
		onSplit,
		onUndoSplit,
		fluid = false,
		busy = false
	}: Props = $props();

	/** The people in the group, the head delegate first. */
	const people = $derived(
		single
			? [single.user]
			: (delegation?.members ?? [])
					.filter((member) => group.memberIds.includes(member.id))
					.toSorted((a, b) => Number(b.isHeadDelegate) - Number(a.isHeadDelegate))
					.map((member) => member.user)
	);
	const names = $derived(
		people.map((user) => formatNames(user.givenName, user.familyName)).join(', ')
	);
	// Only a delegation has wishes to compare its role with.
	const wish = $derived(wishStatus(delegation?.appliedForRoles, group.target));
	/** The buttons that apply to this group. */
	const actions = $derived({
		onSplit: canSplit(group) ? onSplit : undefined,
		onUndoSplit: group.part ? onUndoSplit : undefined
	});
	/** Every wish, the one matching the current role first, then by rank. */
	const wishes = $derived(
		wishList(delegation?.appliedForRoles, group.target, getFullTranslatedCountryNameFromISO3Code)
	);
	/** Holds a role, but none of the wishes is it. */
	const unwished = $derived(wish !== undefined && wish.rank === undefined);
	const wishTone = (matches: boolean) =>
		matches ? 'text-success font-semibold' : unwished ? 'text-warning' : 'text-base-content/60';
	/** Under the names: the school. */
	const subtitle = $derived(single ? single.school : delegation?.school);
	const applicationId = $derived(group.singleParticipantId ?? group.delegationId);
	const sightingLink = $derived(
		applicationId ? sightingHref(conferenceId, applicationId) : undefined
	);
</script>

<div
	role="listitem"
	use:draggable={{ container, dragData: { id: group.key }, disabled: busy }}
	ondragstart={() => onDragChange?.(true)}
	ondragend={() => onDragChange?.(false)}
	aria-busy={busy}
	class="bg-base-100 relative flex {fluid
		? 'w-full'
		: 'w-44'} cursor-grab flex-col gap-1.5 rounded-box border p-2 text-xs shadow-sm {cardBorder(
		review,
		group.pending
	)}"
	title={names}
>
	<div class="flex items-baseline gap-1.5">
		<span class="text-base-content/60 shrink-0" title={m.assignmentGroupSize()}>
			<i class="fa-sharp-duotone fa-solid fa-users"></i>
			{group.size}
		</span>
		<span class="truncate font-bold">{names}</span>
	</div>
	{#if subtitle}
		<span class="text-base-content/60 truncate" title={subtitle}>{subtitle}</span>
	{/if}
	<div class="flex items-center gap-1">
		<StarRating rating={review?.evaluation ?? 0} size="xs" />
		<GroupBadges {group} {review} />
	</div>
	{#if wishes.length > 0}
		<ul class="flex flex-col gap-0.5">
			{#each wishes as item (item.key)}
				<li class="flex items-center gap-1 {wishTone(item.matches)}" title={item.name}>
					{#if item.matches}
						<i class="fa-sharp-duotone fa-solid fa-circle-check shrink-0"></i>
					{:else if unwished}
						<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-warning shrink-0"></i>
					{/if}
					<span class="truncate">{item.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="flex items-center gap-0.5">
		{#if sightingLink}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above -->
			<a
				class="btn btn-ghost btn-xs btn-square"
				href={sightingLink}
				draggable="false"
				aria-label={m.assignmentCardSighting()}
				title={m.assignmentCardSighting()}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			</a>
		{/if}
		<GroupActions {...actions} />
	</div>
	{#if busy}
		<BusyOverlay />
	{/if}
</div>
