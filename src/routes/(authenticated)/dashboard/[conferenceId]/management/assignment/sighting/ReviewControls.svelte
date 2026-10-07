<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { clearsRatingKey, ratingForKey } from '$lib/assignment/deckKeys';
	import { reviewArgs, type SightingReview } from '$lib/assignment/sighting';
	import StarRating from '$lib/components/StarRating.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastError } from '../toastError';
	import { reviewSaved } from './reviewVersion.svelte';

	/** The team's rating, flag and exclusion of one application. */
	interface Props {
		kind: 'delegation' | 'single';
		id: string;
		review: SightingReview | undefined;
	}

	let { kind, id, review }: Props = $props();

	let saving = $state(false);

	/** The mutation takes the whole review, so every change sends the current state with it. */
	async function save(change: Partial<SightingReview>) {
		saving = true;
		await Promise.resolve(
			client.mutate.setAssignmentReview({
				__args: reviewArgs(kind, id, review, change),
				evaluation: true
			})
		)
			.then(reviewSaved)
			.catch(toastError);
		saving = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (clearsRatingKey(event)) {
			event.preventDefault();
			save({ evaluation: null });
			return;
		}
		const evaluation = ratingForKey(event);
		if (evaluation === undefined) return;
		event.preventDefault();
		save({ evaluation });
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-wrap items-center gap-2">
	<kbd class="kbd kbd-xs" title={m.assignmentRateHotkey()}>1</kbd>
	<StarRating
		rating={review?.evaluation ?? 0}
		changeRating={(evaluation) => save({ evaluation })}
		deleteRating={() => save({ evaluation: null })}
	/>
	<kbd class="kbd kbd-xs" title={m.assignmentRateHotkey()}>5</kbd>
	<button
		class="btn btn-square {review?.flagged ? 'btn-warning' : 'btn-ghost'}"
		aria-label={m.assignmentFlag()}
		aria-pressed={!!review?.flagged}
		title={m.assignmentFlag()}
		disabled={saving}
		onclick={() => save({ flagged: !review?.flagged })}
	>
		<i class="fa-duotone fa-flag"></i>
	</button>
	<button
		class="btn btn-square {review?.disqualified ? 'btn-error' : 'btn-ghost'}"
		aria-label={m.assignmentDisqualify()}
		aria-pressed={!!review?.disqualified}
		title={m.assignmentDisqualify()}
		disabled={saving}
		onclick={() => save({ disqualified: !review?.disqualified })}
	>
		<i class="fa-duotone fa-user-slash"></i>
	</button>
</div>
