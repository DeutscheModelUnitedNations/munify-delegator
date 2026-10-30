<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { sightingHref } from '#lib/helpers/sightingLink';
	import StarRating from '#lib/components/StarRating.svelte';

	/**
	 * How the team rated the application in the sighting. Read-only here: the sighting is where it
	 * is rated, next to the other applications.
	 */
	interface Props {
		conferenceId: string;
		/** The delegation's or the single participant's id */
		applicationId: string;
		kind: 'delegation' | 'singleParticipant';
	}

	let { conferenceId, applicationId, kind }: Props = $props();

	const reviews = $derived(
		await client.liveQuery.assignmentReviews({
			__args: {
				where:
					kind === 'delegation'
						? { delegationId: { eq: applicationId } }
						: { singleParticipantId: { eq: applicationId } }
			},
			id: true,
			evaluation: true,
			flagged: true,
			disqualified: true,
			required: true,
			note: true
		})
	);
	const review = $derived(reviews.at(0));
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h3 class="text-lg font-bold">{m.userCardReview()}</h3>
		<a class="btn btn-sm" href={sightingHref(conferenceId, applicationId)}>
			<i class="fa-sharp-duotone fa-solid fa-binoculars"></i>
			{m.assignmentTabSighting()}
		</a>
	</div>
	{#if review}
		<div class="bg-base-200 rounded-box flex flex-col gap-2 px-4 py-3 text-sm">
			<div class="flex flex-wrap items-center gap-2">
				{#if review.evaluation !== null}
					<StarRating rating={review.evaluation} size="md" />
				{:else}
					<span class="text-base-content/60 italic">{m.userCardNotRated()}</span>
				{/if}
				{#if review.flagged}
					<span class="badge badge-warning badge-sm gap-1">
						<i class="fa-sharp-duotone fa-solid fa-flag"></i>
						{m.assignmentStatusFlagged()}
					</span>
				{/if}
				{#if review.required}
					<span class="badge badge-success badge-sm gap-1">
						<i class="fa-sharp-duotone fa-solid fa-thumbtack"></i>
						{m.assignmentRequired()}
					</span>
				{/if}
				{#if review.disqualified}
					<span class="badge badge-error badge-sm gap-1">
						<i class="fa-sharp-duotone fa-solid fa-ban"></i>
						{m.assignmentStatusDisqualified()}
					</span>
				{/if}
			</div>
			{#if review.note}
				<p class="whitespace-pre-line">{review.note}</p>
			{/if}
		</div>
	{:else}
		<div
			class="bg-base-200 rounded-box text-base-content/60 flex items-center gap-4 px-4 py-3 text-sm"
		>
			<i class="fa-sharp-duotone fa-solid fa-eye-slash w-6 text-center text-lg"></i>
			{m.userCardNotReviewed()}
		</div>
	{/if}
</section>
