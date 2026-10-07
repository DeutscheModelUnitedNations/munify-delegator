<script lang="ts">
	import { resolve } from '$app/paths';
	import { canSplit, cardBorder, wishList, wishStatus } from '$lib/assignment/board';
	import type { AssignmentGroup } from '$lib/assignment/state';
	import StarRating from '$lib/components/StarRating.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
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
		conferenceId: string;
		onDragChange?: (dragging: boolean) => void;
		onSplit?: () => void;
		onUndoSplit?: () => void;
		/** Fill the width of the container instead of the fixed card width. */
		fluid?: boolean;
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
		fluid = false
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
	const sightingHref = $derived(
		applicationId
			? resolve(
					`/(authenticated)/dashboard/[conferenceId]/management/assignment/sighting?application=${applicationId}`,
					{ conferenceId }
				)
			: undefined
	);
	const detailsHref = $derived(
		group.singleParticipantId
			? resolve(
					`/(authenticated)/dashboard/[conferenceId]/management/individuals?selected=${group.singleParticipantId}`,
					{ conferenceId }
				)
			: group.delegationId
				? resolve(
						`/(authenticated)/dashboard/[conferenceId]/management/delegations?selected=${group.delegationId}`,
						{ conferenceId }
					)
				: undefined
	);
</script>

<div
	role="listitem"
	use:draggable={{ container, dragData: { id: group.key } }}
	ondragstart={() => onDragChange?.(true)}
	ondragend={() => onDragChange?.(false)}
	class="bg-base-100 flex {fluid
		? 'w-full'
		: 'w-44'} cursor-grab flex-col gap-1.5 rounded-lg border p-2 text-xs shadow-sm {cardBorder(
		review,
		group.pending
	)}"
	title={names}
>
	<div class="flex items-baseline gap-1.5">
		<span class="text-base-content/60 shrink-0" title={m.assignmentGroupSize()}>
			<i class="fa-duotone fa-users"></i>
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
						<i class="fa-duotone fa-circle-check shrink-0"></i>
					{:else if unwished}
						<i
							class="fa-duotone fa-triangle-exclamation text-warning shrink-0 [--fa-secondary-color:currentColor] [--fa-secondary-opacity:0.6]"
						></i>
					{/if}
					<span class="truncate">{item.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="flex items-center gap-0.5">
		{#if sightingHref}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above -->
			<a
				class="btn btn-ghost btn-xs btn-square"
				href={sightingHref}
				draggable="false"
				aria-label={m.assignmentCardSighting()}
				title={m.assignmentCardSighting()}
			>
				<i class="fa-duotone fa-arrow-left"></i>
			</a>
		{/if}
		<GroupActions {...actions} />
		{#if detailsHref}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above -->
			<a
				class="btn btn-ghost btn-xs btn-square ml-auto"
				href={detailsHref}
				target="_blank"
				draggable="false"
				aria-label={m.assignmentCardOpenDetails()}
				title={m.assignmentCardOpenDetails()}
			>
				<i class="fa-duotone fa-arrow-up-right-from-square"></i>
			</a>
		{/if}
	</div>
</div>
