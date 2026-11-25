<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { sightingHref } from '#lib/helpers/sightingLink';
	import StarRating from '#lib/components/StarRating.svelte';
	import Row from '../ui/Row.svelte';

	/**
	 * How the team rated the application in the sighting, as a row of a `Section`. Read-only here: the sighting is where it
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

<Row icon="binoculars" title={m.userCardReview()}>
	{#snippet actions()}
		<a
			class="btn btn-sm btn-ghost text-primary"
			href={sightingHref({ conferenceId, applicationId })}
		>
			{m.open()}
			<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
		</a>
	{/snippet}
	{#if review}
		<div class="flex flex-col gap-2 py-1">
			<div class="flex flex-wrap items-center gap-2">
				{#if review.evaluation !== null}
					<StarRating rating={review.evaluation} size="md" />
				{:else}
					<span class="text-base-content/60 italic">{m.userCardNotRated()}</span>
				{/if}
				{#if review.flagged}
					<span class="badge badge-warning badge-sm gap-1">
						<i aria-hidden="true" class="ph-duotone ph-flag"></i>
						{m.assignmentStatusFlagged()}
					</span>
				{/if}
				{#if review.required}
					<span class="badge badge-success badge-sm gap-1">
						<i aria-hidden="true" class="ph-duotone ph-push-pin"></i>
						{m.assignmentRequired()}
					</span>
				{/if}
				{#if review.disqualified}
					<span class="badge badge-error badge-sm gap-1">
						<i aria-hidden="true" class="ph-duotone ph-prohibit"></i>
						{m.assignmentStatusDisqualified()}
					</span>
				{/if}
			</div>
			{#if review.note}
				<p class="max-w-prose whitespace-pre-line">{review.note}</p>
			{/if}
		</div>
	{:else}
		<span class="text-base-content/60">{m.userCardNotReviewed()}</span>
	{/if}
</Row>
