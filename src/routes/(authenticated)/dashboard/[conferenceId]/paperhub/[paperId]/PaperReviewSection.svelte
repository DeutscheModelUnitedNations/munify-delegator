<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { client, type PaperstatusEnum } from '$lib/api/rumbleClient/client';
	import { writable, get } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { JSONContent } from '@tiptap/core';
	import PaperEditor from '$lib/components/paper/editor';
	import { PieceFoundModal } from '$lib/components/flagCollection';
	import Modal from '$lib/components/Modal.svelte';
	import { getEmptyTipTapDocument } from '$lib/components/paper/editor/contentValidation';
	import { untrack } from 'svelte';
	import { DraftAutosave } from '$lib/components/paper/draft/draftAutosave.svelte';
	import DraftRecoveryModal from '$lib/components/paper/draft/DraftRecoveryModal.svelte';
	import PaperHistory from './PaperHistory.svelte';
	import ReviewStatusPicker from './ReviewStatusPicker.svelte';
	import { hasTextContent } from '../tiptapText';
	import { unlockedPiece, type UnlockedPiece } from './unlockedPiece';

	interface Props {
		paperId: string;
		conferenceId: string;
		currentStatus: PaperstatusEnum;
		authorName?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
		paperContainer?: HTMLElement | null;
		agendaItemId?: string;
	}

	let {
		paperId,
		conferenceId,
		currentStatus,
		authorName = '',
		quoteToInsert,
		onQuoteInserted,
		paperContainer = null,
		agendaItemId
	}: Props = $props();

	// The reviewer's own snippet library, for inserting boilerplate into review comments.
	const snippets = $derived(
		await client.liveQuery.myReviewerSnippets({ id: true, name: true, content: true })
	);

	let reviewed = $state(false);
	let nextPaperId = $state<string | null>(null);

	// Types for draft persistence
	interface ReviewDraft {
		comments: JSONContent;
		selectedStatus: PaperstatusEnum;
		savedAt: number;
	}

	// Review form state
	let reviewComments = writable<JSONContent>(getEmptyTipTapDocument());
	let selectedStatus = $state<PaperstatusEnum>(untrack(() => currentStatus));
	let isSubmitting = $state(false);
	let showConfirmModal = $state(false);

	// The page re-creates this component per paper, so the draft key is fixed for its lifetime.
	const draft = new DraftAutosave<ReviewDraft, JSONContent>(
		`reviewDraft_${untrack(() => paperId)}`,
		{
			// Skip if content is empty
			readContent: () => {
				const comments = get(reviewComments);
				return hasTextContent(comments) ? comments : undefined;
			},
			toDraft: (comments, savedAt) => ({ comments, selectedStatus, savedAt }),
			applyDraft: (saved) => {
				reviewComments.set(saved.comments);
				selectedStatus = saved.selectedStatus;
			}
		}
	);

	// Piece found modal state
	let showPieceFoundModal = $state(false);
	let pieceFoundData = $state<UnlockedPiece | null>(null);

	// Available status options for reviews (both options always available for reviewable statuses)
	let availableTransitions = $derived.by((): { value: PaperstatusEnum; label: string }[] =>
		// Only allow reviews on papers that have been submitted
		currentStatus === 'DRAFT'
			? []
			: [
					{ value: 'CHANGES_REQUESTED', label: m.paperStatusChangesRequested() },
					{ value: 'ACCEPTED', label: m.paperStatusAccepted() }
				]
	);

	// Set initial selected status to first available transition
	$effect(() => {
		if (availableTransitions.length > 0 && selectedStatus === currentStatus) {
			selectedStatus = availableTransitions[0].value;
		}
	});

	const openConfirmModal = () => {
		if (!hasTextContent($reviewComments)) {
			toast.error(m.reviewCommentsRequired());
			return;
		}
		showConfirmModal = true;
	};

	const jumpToNextPaper = () => {
		reviewed = false;
		goto(resolve(`/dashboard/${conferenceId}/paperhub/${nextPaperId}`));
	};

	/** The next paper of the agenda item waiting for a review, if there is one. */
	const findNextPaperId = async (itemId: string) => {
		try {
			const next = await client.query.findNextPaperToReview({
				__args: { agendaItemId: itemId },
				id: true
			});
			return next?.id ?? null;
		} catch {
			return null;
		}
	};

	const handleSubmitReview = async () => {
		if (isSubmitting) return;

		showConfirmModal = false;
		isSubmitting = true;
		try {
			const promise = client.mutate.createPaperReview({
				__args: { paperId, comments: $reviewComments, newStatus: selectedStatus },
				pieceUnlocked: true,
				unlockedPieceData: {
					flagId: true,
					flagName: true,
					flagType: true,
					flagAlpha2Code: true,
					flagAlpha3Code: true,
					fontAwesomeIcon: true,
					pieceName: true,
					foundCount: true,
					totalCount: true,
					isComplete: true
				}
			});
			toast.promise(promise, {
				loading: m.submittingReview(),
				success: m.reviewSubmitted(),
				error: (err) => (err instanceof Error ? err.message : null) || m.reviewSubmitError()
			});

			const result = await promise;

			// Check if a piece was unlocked and show the modal
			const piece = unlockedPiece(result);
			if (piece) {
				pieceFoundData = piece;
				showPieceFoundModal = true;
			}

			reviewed = true;
			if (agendaItemId) {
				nextPaperId = await findNextPaperId(agendaItemId);
			}

			// Clear form and localStorage draft
			reviewComments.set(getEmptyTipTapDocument());
			draft.clear();
		} finally {
			isSubmitting = false;
		}
	};
</script>

<DraftRecoveryModal {draft} />

<div class="card bg-base-200 p-4 flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.addReview()}</h3>

	{#if reviewed}
		<!-- Options after review has been saved -->
		<div class="alert alert-success">
			<i class="fa-solid fa-check-circle"></i>
			<span>{m.reviewAddedSuccessfully()}</span>
		</div>
		{#if nextPaperId && agendaItemId}
			<button class="btn btn-outline" onclick={jumpToNextPaper}>
				<i class="fa-solid fa-angles-right"></i>
				<span class="runway-text-swoop">{m.jumpToNextPaper()}</span>
			</button>
		{:else if agendaItemId}
			<div class="flex flex-col items-center justify-center w-full">
				<span class="text-celebrate font-bold text-lg text-center">
					{m.allPapersReviewed()}
				</span>
			</div>
		{/if}
	{/if}

	{#if availableTransitions.length === 0}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
			<span>{m.noStatusTransitionsAvailable()}</span>
		</div>
	{:else}
		<!-- Comments Editor -->
		{#key draft.editorKey}
			<PaperEditor.ReviewFormat
				contentStore={reviewComments}
				{quoteToInsert}
				{onQuoteInserted}
				{paperContainer}
				{snippets}
			/>
		{/key}

		<!-- Status Selector -->
		<ReviewStatusPicker transitions={availableTransitions} bind:selected={selectedStatus} />

		<!-- Submit Button -->
		<button class="btn btn-primary" onclick={openConfirmModal} disabled={isSubmitting}>
			{#if isSubmitting}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<i class="fa-solid fa-paper-plane"></i>
			{/if}
			{m.submitReview()}
		</button>
	{/if}
</div>

<!-- Review Confirmation Modal -->
<Modal bind:open={showConfirmModal} title={m.confirmReviewSubmission()}>
	<div class="flex flex-col gap-4">
		<div class="alert alert-warning">
			<i class="fa-solid fa-exclamation-triangle"></i>
			<span>{m.reviewSubmissionWarning()}</span>
		</div>
		<p class="text-sm text-base-content/70">
			{m.reviewSubmissionNotification({ author: authorName || m.theAuthor() })}
		</p>
	</div>

	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={() => (showConfirmModal = false)}>
				{m.cancel()}
			</button>
			<button class="btn btn-primary" onclick={handleSubmitReview}>
				<i class="fa-solid fa-paper-plane"></i>
				{m.submitReview()}
			</button>
		</div>
	{/snippet}
</Modal>

<PaperHistory {paperId} {paperContainer} />

<!-- Piece Found Modal -->
{#if pieceFoundData}
	<PieceFoundModal
		bind:open={showPieceFoundModal}
		flagName={pieceFoundData.flagName}
		flagAlpha2Code={pieceFoundData.flagAlpha2Code}
		flagAlpha3Code={pieceFoundData.flagAlpha3Code}
		flagType={pieceFoundData.flagType}
		fontAwesomeIcon={pieceFoundData.fontAwesomeIcon}
		pieceName={pieceFoundData.pieceName}
		isComplete={pieceFoundData.isComplete}
		foundCount={pieceFoundData.foundCount}
		totalCount={pieceFoundData.totalCount}
		onclose={() => (pieceFoundData = null)}
		onViewCollection={() => {
			goto(resolve(`/dashboard/${conferenceId}/paperhub#flag-collection`));
		}}
	/>
{/if}

<style lang="postcss">
	.runway-text-swoop {
		/* 1. Define the gradient: Base Color -> Shine Color -> Base Color */
		/* We use a wide gradient (200%) so we can slide it across */
		background: linear-gradient(
			110deg,
			#374151 45%,
			/* Left: Standard Text Color (Dark Grey) */ #ffffff 50%,
			/* Center: The "Swoop" highlight (White) */ #374151 55%
				/* Right: Standard Text Color (Dark Grey) */
		);

		/* 2. Key: Clip the background to the text shape */
		background-clip: text;
		-webkit-background-clip: text;

		/* 3. Make the text transparent so the background shows through */
		color: transparent;
		-webkit-text-fill-color: transparent;

		/* 4. Sizing: Make background double width to allow movement */
		background-size: 225% 100%;

		/* 5. Animation */
		animation: shine-pass 2.5s infinite;
	}

	/* Dark Mode Support (If your app uses class="dark" or media queries) */
	@media (prefers-color-scheme: dark) {
		.runway-text-swoop {
			background: linear-gradient(
				110deg,
				#9ca3af 45%,
				/* Base: Light Grey */ #ffffff 50%,
				/* Shine: Bright White */ #9ca3af 55% /* Base: Light Grey */
			);
			background-clip: text;
			-webkit-background-clip: text;
			background-size: 225% 100%;
		}
	}

	/* The Movement Logic */
	@keyframes shine-pass {
		0% {
			background-position: 100% 50%; /* Start: Highlight off to the right */
		}
		100% {
			background-position: 0% 50%; /* End: Highlight moves to the left */
		}
	}

	/* Text Shine (Refined for Success) */
	.text-celebrate {
		background: linear-gradient(90deg, #166534, #22c55e, #166534);
		background-size: 200% auto;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: text-shimmer 2s linear infinite;
	}

	@keyframes text-shimmer {
		to {
			background-position: 200% center;
		}
	}
</style>
