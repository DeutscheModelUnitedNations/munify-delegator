<script lang="ts">
	import { clearsRatingKey, ratingForKey } from '$lib/assignment/deckKeys';
	import type { SightingReview } from '$lib/assignment/sighting';
	import StarRating from '$lib/components/StarRating.svelte';
	import { m } from '$lib/paraglide/messages';

	/** The team's rating, flag and exclusion of one application. */
	interface Props {
		review: SightingReview | undefined;
		/** Changes the review; shown at once, saved behind the scenes */
		onReview: (change: Partial<SightingReview>) => void;
	}

	let { review, onReview }: Props = $props();

	function onKeydown(event: KeyboardEvent) {
		if (clearsRatingKey(event)) {
			event.preventDefault();
			onReview({ evaluation: null });
			return;
		}
		const evaluation = ratingForKey(event);
		if (evaluation === undefined) return;
		event.preventDefault();
		onReview({ evaluation });
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-wrap items-center gap-2">
	<kbd class="kbd kbd-xs" title={m.assignmentRateHotkey()}>1</kbd>
	<StarRating
		rating={review?.evaluation ?? 0}
		changeRating={(evaluation) => onReview({ evaluation })}
		deleteRating={() => onReview({ evaluation: null })}
	/>
	<kbd class="kbd kbd-xs" title={m.assignmentRateHotkey()}>5</kbd>
	<button
		class="btn btn-square {review?.flagged ? 'btn-warning' : 'btn-ghost'}"
		aria-label={m.assignmentFlag()}
		aria-pressed={!!review?.flagged}
		title={m.assignmentFlag()}
		onclick={() => onReview({ flagged: !review?.flagged })}
	>
		<i class="fa-sharp-duotone fa-solid fa-flag"></i>
	</button>
	<button
		class="btn btn-square {review?.disqualified ? 'btn-error' : 'btn-ghost'}"
		aria-label={m.assignmentDisqualify()}
		aria-pressed={!!review?.disqualified}
		title={m.assignmentDisqualify()}
		onclick={() => onReview({ disqualified: !review?.disqualified })}
	>
		<i class="fa-sharp-duotone fa-solid fa-user-slash"></i>
	</button>
</div>
