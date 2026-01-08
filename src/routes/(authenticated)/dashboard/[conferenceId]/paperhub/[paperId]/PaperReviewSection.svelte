<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, type PaperStatus$options } from '$houdini';
	import { writable } from 'svelte/store';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
	import CommonEditor from '$lib/components/Paper/Editor/CommonEditor.svelte';

	interface Review {
		id: string;
		comments: any;
		createdAt: string;
		statusBefore?: PaperStatus$options | null;
		statusAfter?: PaperStatus$options | null;
		reviewer: {
			id: string;
			given_name: string;
			family_name: string;
		};
	}

	interface Props {
		paperId: string;
		currentStatus: PaperStatus$options;
		existingReviews: Review[];
	}

	let { paperId, currentStatus, existingReviews }: Props = $props();

	// Review form state
	let reviewComments = writable<any>({});
	let selectedStatus = $state<PaperStatus$options>(currentStatus);

	const createReviewMutation = graphql(`
		mutation CreatePaperReview($paperId: String!, $comments: Json!, $newStatus: PaperStatus!) {
			createPaperReview(paperId: $paperId, comments: $comments, newStatus: $newStatus) {
				id
			}
		}
	`);

	// Available status transitions based on current status
	let availableTransitions = $derived.by(() => {
		switch (currentStatus) {
			case 'SUBMITTED':
				return [
					{ value: 'CHANGES_REQUESTED', label: m.paperStatusChangesRequested() },
					{ value: 'ACCEPTED', label: m.paperStatusAccepted() }
				];
			case 'CHANGES_REQUESTED':
				return [{ value: 'ACCEPTED', label: m.paperStatusAccepted() }];
			case 'ACCEPTED':
				return [{ value: 'CHANGES_REQUESTED', label: m.paperStatusChangesRequested() }];
			default:
				return [];
		}
	});

	// Set initial selected status to first available transition
	$effect(() => {
		if (availableTransitions.length > 0 && selectedStatus === currentStatus) {
			selectedStatus = availableTransitions[0].value as PaperStatus$options;
		}
	});

	const handleSubmitReview = async () => {
		const comments = $reviewComments;
		if (!comments || Object.keys(comments).length === 0) {
			toast.error(m.reviewCommentsRequired());
			return;
		}

		await toast.promise(
			createReviewMutation.mutate({
				paperId,
				comments,
				newStatus: selectedStatus
			}),
			{
				loading: m.submittingReview(),
				success: m.reviewSubmitted(),
				error: (err) => err.message || m.reviewSubmitError()
			}
		);

		// Clear form
		reviewComments.set({});

		// Reload data
		await invalidateAll();
	};
</script>

<div class="card bg-base-200 p-4 flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.addReview()}</h3>

	{#if availableTransitions.length === 0}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.noStatusTransitionsAvailable()}</span>
		</div>
	{:else}
		<!-- Status Selector -->
		<div class="form-control">
			<label class="label">
				<span class="label-text font-semibold">{m.newStatus()}</span>
			</label>
			<select class="select select-bordered" bind:value={selectedStatus}>
				{#each availableTransitions as transition}
					<option value={transition.value}>{transition.label}</option>
				{/each}
			</select>
		</div>

		<!-- Comments Editor -->
		<div class="form-control">
			<label class="label">
				<span class="label-text font-semibold">{m.reviewComments()}</span>
			</label>
			<div class="border border-base-300 rounded-box">
				<CommonEditor
					contentStore={reviewComments}
					editable={true}
					placeholder={m.enterYourReviewComments()}
					legend=""
				/>
			</div>
		</div>

		<!-- Submit Button -->
		<button class="btn btn-primary" onclick={handleSubmitReview}>
			<i class="fa-solid fa-paper-plane"></i>
			{m.submitReview()}
		</button>
	{/if}
</div>

<!-- Review History -->
{#if existingReviews.length > 0}
	<div class="card bg-base-200 p-4">
		<h3 class="text-lg font-bold mb-4">{m.reviewHistory()}</h3>
		<div class="flex flex-col gap-3">
			{#each existingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as review}
				<div class="card bg-base-100 p-3">
					<div class="flex justify-between items-start mb-2">
						<div>
							<p class="font-semibold">
								{review.reviewer.given_name}
								{review.reviewer.family_name}
							</p>
							<p class="text-sm opacity-70">
								{new Date(review.createdAt).toLocaleString()}
							</p>
						</div>
						{#if review.statusBefore && review.statusAfter}
							<div class="badge badge-sm">
								{review.statusBefore} → {review.statusAfter}
							</div>
						{/if}
					</div>
					<div class="prose prose-sm max-w-none">
						{@html review.comments}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
