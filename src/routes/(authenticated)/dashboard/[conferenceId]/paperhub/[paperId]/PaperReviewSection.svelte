<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { client, type PaperstatusEnum } from '#lib/api/rumbleClient/client';
	import { writable } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { JSONContent } from '@tiptap/core';
	import PaperEditor from '#lib/components/paper/editor/index';
	import { PieceFoundModal } from '#lib/components/flagCollection/index';
	import Modal from '#lib/components/Modal.svelte';
	import { getEmptyTipTapDocument } from '#lib/components/paper/editor/contentValidation';
	import { onDestroy, untrack } from 'svelte';
	import PaperHistory from './PaperHistory.svelte';
	import ReviewStatusPicker from './ReviewStatusPicker.svelte';
	import { hasTextContent } from '../tiptapText';
	import { unlockedPiece, type UnlockedPiece } from './unlockedPiece';
	import {
		changedElsewhere,
		draftNotice,
		draftSnapshotToSave,
		staleDraftWarning,
		type DraftSaveState
	} from './reviewDraft';
	import ReviewDraftNotices from './ReviewDraftNotices.svelte';
	import ReviewDraftFooter from './ReviewDraftFooter.svelte';
	import { createPersistedState } from '#lib/state/persistedState.svelte.js';
	import ReviewAnonymityToggle from './ReviewAnonymityToggle.svelte';
	import {
		anonymityArgs,
		DEFAULT_REVIEW_ANONYMITY,
		reviewAnonymityComplete,
		reviewAnonymityName,
		storedReviewAnonymity,
		type ReviewAnonymity
	} from './reviewAnonymity';

	interface Props {
		paperId: string;
		conferenceId: string;
		currentStatus: PaperstatusEnum;
		/** The paper's latest version, which a draft may have been written before. */
		latestVersion: number;
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
		latestVersion,
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

	// The reviewer's own draft of this review (an AI assistant may have written it over MCP).
	const DRAFT_SELECTION = {
		comments: true,
		statusAfter: true,
		origin: true,
		lastEditedVia: true,
		createdAt: true,
		updatedAt: true,
		paperVersion: { version: true }
	} as const;
	const storedDraft = $derived(
		await client.liveQuery.myPaperReviewDraft({ __args: { paperId }, ...DRAFT_SELECTION })
	);
	// The stored draft, unless this editor discarded or sent exactly that one: a live result does
	// not reliably turn null again, and a later draft (another `updatedAt`) shows up as usual.
	let goneUpdatedAt = $state<number | undefined>(undefined);
	const storedUpdatedAt = $derived(
		storedDraft ? new Date(storedDraft.updatedAt).getTime() : undefined
	);
	const hasDraft = $derived(storedUpdatedAt !== undefined && storedUpdatedAt !== goneUpdatedAt);
	const draftOrigin = $derived(hasDraft ? storedDraft?.origin : undefined);
	const draftLastEditedVia = $derived(storedDraft?.lastEditedVia);
	const draftCreatedAt = $derived(storedDraft?.createdAt);
	const draftUpdatedAt = $derived(storedDraft?.updatedAt);
	const draftVersion = $derived(hasDraft ? storedDraft?.paperVersion.version : undefined);

	// Seeded once from the draft: re-reading it while the reviewer types would discard their edits.
	const initialDraft = await client.query.myPaperReviewDraft({
		__args: { paperId: untrack(() => paperId) },
		...DRAFT_SELECTION
	});

	// Review form state
	let reviewComments = writable<JSONContent>(initialDraft?.comments ?? getEmptyTipTapDocument());
	let selectedStatus = $state<PaperstatusEnum>(
		initialDraft?.statusAfter ?? untrack(() => currentStatus)
	);
	let isSubmitting = $state(false);
	let showConfirmModal = $state(false);
	let showDiscardModal = $state(false);
	/** Bumped to remount the editor when its content is replaced from outside. */
	let editorKey = $state(0);

	// What the editor last loaded or saved, so autosave skips what is stored already and an
	// assistant's later change is told apart from this editor's own.
	let savedSnapshot: string | undefined = initialDraft
		? JSON.stringify({ comments: initialDraft.comments, status: initialDraft.statusAfter })
		: undefined;
	let knownUpdatedAt = $state<number | undefined>(
		initialDraft ? new Date(initialDraft.updatedAt).getTime() : undefined
	);
	let saveState = $state<DraftSaveState>('idle');
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	const notice = $derived(
		draftOrigin && draftLastEditedVia && draftCreatedAt && draftUpdatedAt
			? draftNotice({
					origin: draftOrigin,
					lastEditedVia: draftLastEditedVia,
					createdAt: draftCreatedAt,
					updatedAt: draftUpdatedAt
				})
			: []
	);
	const staleWarning = $derived(
		draftVersion === undefined
			? undefined
			: staleDraftWarning({ draftVersion, currentVersion: latestVersion })
	);
	const assistantChangedDraft = $derived(
		hasDraft &&
			changedElsewhere({
				draft:
					draftLastEditedVia && draftUpdatedAt
						? { lastEditedVia: draftLastEditedVia, updatedAt: draftUpdatedAt }
						: null,
				knownUpdatedAt
			})
	);

	// Whether to publish under another name instead of the reviewer's, remembered across reviews.
	const anonymityStore = createPersistedState<ReviewAnonymity>({
		key: 'paperReviewAnonymity',
		initial: DEFAULT_REVIEW_ANONYMITY
	});
	const anonymity = $derived(storedReviewAnonymity(anonymityStore.current));
	const anonymityComplete = $derived(reviewAnonymityComplete(anonymity));

	// Who will be told, and under which name when the review goes out anonymously.
	const submissionNotice = $derived.by(() => {
		const author = authorName || m.theAuthor();
		const notified = m.reviewSubmissionNotification({ author });
		const name = reviewAnonymityName(anonymity);
		if (!name) return notified;
		return `${notified} ${m.reviewSubmissionAnonymousNotice({ author, name })}`;
	});

	/** Saves the editor's content as the draft, unless it is empty or stored already. */
	async function saveDraft(comments: JSONContent, status: PaperstatusEnum) {
		const toSave = isSubmitting
			? undefined
			: draftSnapshotToSave({ comments, status, savedSnapshot });
		if (!toSave) return;
		const snapshot = toSave.snapshot;
		saveState = 'saving';
		try {
			const saved = await client.mutate.savePaperReviewDraft({
				__args: { paperId, comments, statusAfter: toSave.status },
				updatedAt: true
			});
			savedSnapshot = snapshot;
			knownUpdatedAt = new Date(saved.updatedAt).getTime();
			saveState = 'saved';
		} catch {
			saveState = 'failed';
		}
	}

	// Saves the draft a moment after the reviewer stops typing or picks another status.
	$effect(() => {
		const comments = $reviewComments;
		const status = selectedStatus;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveDraft(comments, status), 1500);
	});
	onDestroy(() => clearTimeout(saveTimer));

	/** Puts the stored draft into the editor, replacing what it holds. */
	async function loadStoredDraft() {
		const latest = await client.query.myPaperReviewDraft({
			__args: { paperId },
			...DRAFT_SELECTION
		});
		if (!latest) return;
		clearTimeout(saveTimer);
		reviewComments.set(latest.comments);
		selectedStatus = latest.statusAfter;
		savedSnapshot = JSON.stringify({ comments: latest.comments, status: latest.statusAfter });
		knownUpdatedAt = new Date(latest.updatedAt).getTime();
		editorKey++;
	}

	/** Deletes the draft and empties the editor. */
	async function discardDraft() {
		showDiscardModal = false;
		clearTimeout(saveTimer);
		const promise = Promise.resolve(client.mutate.deletePaperReviewDraft({ __args: { paperId } }));
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.reviewDraftDiscarded(),
			error: (err) => (err instanceof Error ? err.message : null) || m.genericToastError()
		});
		await promise;
		resetEditor();
	}

	function resetEditor() {
		goneUpdatedAt = Math.max(storedUpdatedAt ?? 0, knownUpdatedAt ?? 0);
		reviewComments.set(getEmptyTipTapDocument());
		savedSnapshot = undefined;
		knownUpdatedAt = undefined;
		saveState = 'idle';
		editorKey++;
	}

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

	// Set initial selected status to first available transition, unless a draft proposes one
	$effect(() => {
		if (initialDraft) return;
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
		goto(resolve(`dashboard/${conferenceId}/paperhub/${nextPaperId}`));
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
		clearTimeout(saveTimer);
		try {
			const promise = client.mutate.createPaperReview({
				__args: {
					paperId,
					comments: $reviewComments,
					newStatus: selectedStatus,
					...anonymityArgs(anonymity)
				},
				pieceUnlocked: true,
				unlockedPieceData: {
					flagId: true,
					flagName: true,
					flagType: true,
					flagAlpha2Code: true,
					flagAlpha3Code: true,
					icon: true,
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

			// The review is out; the server deleted the draft along with it.
			resetEditor();
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div id="review" class="card bg-base-200 p-4 flex flex-col gap-4 scroll-mt-20">
	<h2 class="text-lg font-bold">{m.addReview()}</h2>

	<ReviewDraftNotices
		{notice}
		{staleWarning}
		assistantChanged={assistantChangedDraft}
		onLoadNew={loadStoredDraft}
	/>

	{#if reviewed}
		<!-- Options after review has been saved -->
		<div class="alert alert-success">
			<i aria-hidden="true" class="ph-duotone ph-check-circle"></i>
			<span>{m.reviewAddedSuccessfully()}</span>
		</div>
		{#if nextPaperId && agendaItemId}
			<button class="btn btn-outline" onclick={jumpToNextPaper}>
				<i aria-hidden="true" class="ph-duotone ph-caret-double-right"></i>
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
			<i aria-hidden="true" class="ph-duotone ph-info"></i>
			<span>{m.noStatusTransitionsAvailable()}</span>
		</div>
	{:else}
		<!-- Comments Editor -->
		{#key editorKey}
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

		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<ReviewAnonymityToggle
				bind:choice={() => anonymity, (next) => (anonymityStore.current = next)}
			/>

			<button
				class="btn btn-primary grow"
				onclick={openConfirmModal}
				disabled={isSubmitting || !anonymityComplete}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
				{/if}
				{m.submitReview()}
			</button>
		</div>

		<ReviewDraftFooter
			{saveState}
			{hasDraft}
			disabled={isSubmitting}
			onDiscard={() => (showDiscardModal = true)}
		/>
	{/if}
</div>

<Modal bind:open={showDiscardModal} title={m.reviewDraftDiscardTitle()}>
	<p>{m.reviewDraftDiscardConfirm()}</p>
	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={() => (showDiscardModal = false)}>{m.cancel()}</button>
			<button class="btn btn-error" onclick={discardDraft}>
				<i aria-hidden="true" class="ph-duotone ph-trash"></i>
				{m.reviewDraftDiscard()}
			</button>
		</div>
	{/snippet}
</Modal>

<!-- Review Confirmation Modal -->
<Modal bind:open={showConfirmModal} title={m.confirmReviewSubmission()}>
	<div class="flex flex-col gap-4">
		<div class="alert alert-warning">
			<i aria-hidden="true" class="ph-duotone ph-warning"></i>
			<span>{m.reviewSubmissionWarning()}</span>
		</div>
		<p class="text-sm text-base-content/70">{submissionNotice}</p>
	</div>

	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={() => (showConfirmModal = false)}>{m.cancel()}</button>

			<button class="btn btn-primary" onclick={handleSubmitReview}>
				<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
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
		icon={pieceFoundData.icon}
		pieceName={pieceFoundData.pieceName}
		isComplete={pieceFoundData.isComplete}
		foundCount={pieceFoundData.foundCount}
		totalCount={pieceFoundData.totalCount}
		onclose={() => (pieceFoundData = null)}
		onViewCollection={() => {
			goto(resolve(`dashboard/${conferenceId}/paperhub#flag-collection`));
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
