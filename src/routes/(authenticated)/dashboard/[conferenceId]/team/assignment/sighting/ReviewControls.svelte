<script lang="ts">
	import { clearsRatingKey, ratingForKey } from '#lib/assignment/deckKeys.js';
	import type { SightingReview } from '#lib/assignment/sighting.js';
	import StarRating from '#lib/components/StarRating.svelte';
	import { m } from '#lib/paraglide/messages.js';

	/** The team's rating, flag, requirement and exclusion of one application. */
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
	<kbd class="kbd kbd-xs hidden sm:inline-block" title={m.assignmentRateHotkey()}>1</kbd>
	<StarRating
		rating={review?.evaluation ?? 0}
		changeRating={(evaluation) => onReview({ evaluation })}
		deleteRating={() => onReview({ evaluation: null })}
	/>
	<kbd class="kbd kbd-xs hidden sm:inline-block" title={m.assignmentRateHotkey()}>5</kbd>
	<button
		class="btn btn-square {review?.flagged ? 'btn-warning' : 'btn-ghost'}"
		aria-label={m.assignmentFlag()}
		aria-pressed={!!review?.flagged}
		title={m.assignmentFlag()}
		onclick={() => onReview({ flagged: !review?.flagged })}
	>
		<i class="fa-sharp-duotone fa-solid fa-flag"></i>
	</button>
	<!-- Required and excluded rule each other out: setting one clears the other. -->
	<button
		class="btn btn-square {review?.required ? 'btn-success' : 'btn-ghost'}"
		aria-label={m.assignmentRequire()}
		aria-pressed={!!review?.required}
		title={m.assignmentRequireHint()}
		onclick={() => onReview({ required: !review?.required, disqualified: false })}
	>
		<i class="fa-sharp-duotone fa-solid fa-thumbtack"></i>
	</button>
	<button
		class="btn btn-square {review?.disqualified ? 'btn-error' : 'btn-ghost'}"
		aria-label={m.assignmentDisqualify()}
		aria-pressed={!!review?.disqualified}
		title={m.assignmentDisqualify()}
		onclick={() => onReview({ disqualified: !review?.disqualified, required: false })}
	>
		<i class="fa-sharp-duotone fa-solid fa-user-slash"></i>
	</button>
</div>
