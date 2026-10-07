<script lang="ts">
	import { cardBorder, type BoardReviewRow } from '$lib/assignment/board';
	import StarRating from '$lib/components/StarRating.svelte';
	import { resolve } from '$app/paths';
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
		/** The role the participant currently holds (pending included), if any. */
		roleId?: string | null;
		onDragChange: (dragging: boolean) => void;
		conferenceId: string;
	}

	let {
		singleParticipantId,
		single,
		review,
		pending,
		container,
		roleId = null,
		onDragChange,
		conferenceId
	}: Props = $props();

	const detailsHref = $derived(
		resolve(
			`/(authenticated)/dashboard/[conferenceId]/management/individuals?selected=${singleParticipantId}`,
			{
				conferenceId
			}
		)
	);
	const sightingHref = $derived(
		resolve(
			`/(authenticated)/dashboard/[conferenceId]/management/assignment/sighting?application=${singleParticipantId}`,
			{ conferenceId }
		)
	);
	/** Every wish, the one matching the current assignment first. Wishes of a single are unranked. */
	const wishes = $derived(
		(single?.appliedForRoles ?? [])
			.map((role) => ({ id: role.id, name: role.name, matches: role.id === roleId }))
			.toSorted((a, b) => Number(b.matches) - Number(a.matches))
	);
	/** Holds a role, but none of the wishes is it. */
	const unwished = $derived(roleId != null && !wishes.some((wish) => wish.matches));
	const wishTone = $derived(
		wishes.map((wish) => {
			if (wish.matches) return 'text-success font-semibold';
			return unwished ? 'text-warning' : 'text-base-content/60';
		})
	);
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
	{#if single?.school}
		<span class="text-base-content/60 truncate" title={single.school}>{single.school}</span>
	{/if}
	<div class="flex items-center gap-1">
		<StarRating rating={review?.evaluation ?? 0} size="xs" />
		{#if review?.flagged}
			<i
				class="fa-duotone fa-flag text-warning [--fa-secondary-color:currentColor] [--fa-secondary-opacity:0.6]"
			></i>
		{/if}
	</div>
	{#if wishes.length > 0}
		<ul class="flex flex-col gap-0.5">
			{#each wishes as wish, index (wish.id)}
				<li class="flex items-center gap-1 {wishTone[index]}" title={wish.name}>
					{#if wish.matches}
						<i class="fa-duotone fa-circle-check shrink-0"></i>
					{:else if unwished}
						<i
							class="fa-duotone fa-triangle-exclamation text-warning shrink-0 [--fa-secondary-color:currentColor] [--fa-secondary-opacity:0.6]"
						></i>
					{/if}
					<span class="truncate">{wish.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="flex items-end justify-between gap-1">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above, with the selection as query -->
		<a
			class="btn btn-ghost btn-xs btn-square shrink-0"
			href={sightingHref}
			draggable="false"
			aria-label={m.assignmentTabSighting()}
			title={m.assignmentTabSighting()}
		>
			<i class="fa-duotone fa-arrow-left"></i>
		</a>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above, with the selection as query -->
		<a
			class="btn btn-ghost btn-xs btn-square shrink-0"
			href={detailsHref}
			target="_blank"
			draggable="false"
			aria-label={m.assignmentOpenDetails()}
			title={m.assignmentOpenDetails()}
		>
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
	</div>
</div>
