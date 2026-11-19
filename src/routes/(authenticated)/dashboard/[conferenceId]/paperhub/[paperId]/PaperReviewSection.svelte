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
	import { browser } from '$app/env';
	import PaperHistory from './PaperHistory.svelte';
	import ReviewStatusPicker from './ReviewStatusPicker.svelte';
	import { hasTextContent } from '../tiptapText';
	import { unlockedPiece, type UnlockedPiece } from './unlockedPiece';
	import {
		changedElsewhere,
		draftNotice,
		legacyBrowserDraft,
		legacyDraftKey,
		staleDraftWarning,
		startingVerdict
	} from './reviewDraft';
	import { createDraftSaver } from './reviewDraftSaver.svelte.js';
	import { hasErrorCode } from '#lib/api/errorCodes';
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

	// Seeded once from the draft: re-reading it while the reviewer types would discard their edits.
	const initialDraft = await client.query.myPaperReviewDraft({
		__args: { paperId: untrack(() => paperId) },
		...DRAFT_SELECTION
	});
	// Without a draft on the server, an unsent review the editor kept in this browser before
	// drafts were stored there is taken over, and saved as the draft right after. The browser keeps
	// it until the server has it (or the reviewer discards or sends the review).
	const legacyKey = legacyDraftKey(untrack(() => paperId));
	const legacyDraft = initialDraft ? undefined : readLegacyDraft();

	/** The review this browser kept for the paper the old way, if any. */
	function readLegacyDraft() {
		if (!browser) return undefined;
		try {
			return legacyBrowserDraft(localStorage.getItem(legacyKey));
		} catch {
			return undefined;
		}
	}

	// Until the server has it, the browser's review is a draft too, and can be discarded.
	let legacyPending = $state(legacyDraft !== undefined);

	/** Forgets the review this browser kept the old way, once it is no longer needed. */
	function dropLegacyDraft() {
		if (!legacyPending) return;
		legacyPending = false;
		try {
			localStorage.removeItem(legacyKey);
		} catch {
			// nothing to forget where storage is blocked
		}
	}

	// Review form state
	let reviewComments = writable<JSONContent>(
		initialDraft?.comments ?? legacyDraft?.comments ?? getEmptyTipTapDocument()
	);
	// A draft's verdict, the browser's kept one included, wins over the editor's default.
	const draftVerdict = startingVerdict({ stored: initialDraft, legacy: legacyDraft });
	let selectedStatus = $state<PaperstatusEnum>(draftVerdict ?? untrack(() => currentStatus));
	let isSubmitting = $state(false);
	let showConfirmModal = $state(false);
	let showDiscardModal = $state(false);
	/** Bumped to remount the editor when its content is replaced from outside. */
	let editorKey = $state(0);

	// The paper version the review in the editor was written for: the loaded draft's, or the
	// latest when the editor's first save created the draft. Not the stored draft's, which an
	// assistant may have rewritten for a newer version while older comments are still here.
	let editorVersion = $state<number | undefined>(initialDraft?.paperVersion.version);

	// Saves the editor's content as the draft; knows what the editor last loaded or saved, so an
	// assistant's later change is told apart from this editor's own.
	const saver = createDraftSaver({
		save: async ({ comments, status, expectedUpdatedAt }) => {
			const saved = await client.mutate.savePaperReviewDraft({
				__args: {
					paperId,
					comments,
					statusAfter: status,
					expectedUpdatedAt: expectedUpdatedAt === undefined ? null : new Date(expectedUpdatedAt)
				},
				updatedAt: true,
				paperVersion: true
			});
			return { updatedAt: saved.updatedAt, version: saved.paperVersion };
		},
		onSaved: (saved) => {
			editorVersion ??= saved.version;
			dropLegacyDraft();
		},
		isConflict: (err) => hasErrorCode({ err, code: 'CONFLICT' })
	});
	if (initialDraft) {
		saver.loaded({
			editor: { comments: initialDraft.comments, status: initialDraft.statusAfter },
			updatedAt: initialDraft.updatedAt
		});
	}

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
		editorVersion === undefined || !hasDraft
			? undefined
			: staleDraftWarning({ draftVersion: editorVersion, currentVersion: latestVersion })
	);
	const assistantChangedDraft = $derived(
		hasDraft &&
			changedElsewhere({
				draft:
					draftLastEditedVia && draftUpdatedAt
						? { lastEditedVia: draftLastEditedVia, updatedAt: draftUpdatedAt }
						: null,
				knownUpdatedAt: saver.knownUpdatedAt
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

	// While an assistant's rewrite waits for the reviewer's choice, saving would replace it.
	$effect(() => {
		if (assistantChangedDraft) void saver.settle();
	});

	// The draft changed meanwhile and the editor waits for the reviewer's choice: an assistant's
	// rewrite seen live, or anything else (another tab, a discard there) the server refused a save for.
	const changedDraft = $derived(
		assistantChangedDraft ? 'assistant' : saver.state === 'conflict' ? 'elsewhere' : undefined
	);

	/** Keeps the editor's version: the draft stored now is replaced with the next save. */
	async function keepMine() {
		const latest = await client.query.myPaperReviewDraft({
			__args: { paperId },
			updatedAt: true
		});
		saver.acknowledge(latest?.updatedAt ?? null);
		saver.resume();
	}

	// Saves the draft a moment after the reviewer stops typing or picks another status. Only the
	// editor is tracked: the saver's own state changing must not count as an edit.
	$effect(() => {
		const editor = { comments: $reviewComments, status: selectedStatus };
		untrack(() => saver.edited(editor));
	});
	// Leaving the paper saves what is pending rather than dropping it; closing or reloading the
	// page, where no save can be waited for, asks first while something is not stored yet.
	// The page is gone by the time that save answers, so a failure is told in a toast.
	onDestroy(() => {
		void saver.flush().then(() => {
			if (saver.state === 'failed') toast.error(m.reviewDraftSaveFailed());
		});
	});
	function warnUnsaved(event: BeforeUnloadEvent) {
		if (!saver.dirty && saver.state !== 'saving') return;
		void saver.flush();
		event.preventDefault();
	}

	/** What the editor holds right now, to tell whether it changed meanwhile. */
	const editorSnapshot = () =>
		JSON.stringify({ comments: $reviewComments, status: selectedStatus });

	/** Puts the stored draft into the editor, unless the reviewer typed while it loaded. */
	async function loadStoredDraft() {
		const before = editorSnapshot();
		const latest = await client.query.myPaperReviewDraft({
			__args: { paperId },
			...DRAFT_SELECTION
		});
		if (editorSnapshot() !== before) return;
		if (!latest) {
			// discarded elsewhere: loading what is stored empties the editor
			resetEditor();
			saver.resume();
			return;
		}
		reviewComments.set(latest.comments);
		selectedStatus = latest.statusAfter;
		editorVersion = latest.paperVersion.version;
		saver.loaded({
			editor: { comments: latest.comments, status: latest.statusAfter },
			updatedAt: latest.updatedAt
		});
		saver.resume();
		editorKey++;
	}

	/** Deletes the draft and empties the editor, once a save on its way has arrived. */
	async function discardDraft() {
		showDiscardModal = false;
		// What the reviewer chose to discard: anything typed from here on, while a running save
		// settles or the deletion is on its way, stays.
		const before = editorSnapshot();
		await saver.settle();
		const promise = Promise.resolve(client.mutate.deletePaperReviewDraft({ __args: { paperId } }));
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.reviewDraftDiscarded(),
			error: (err) => (err instanceof Error ? err.message : null) || m.genericToastError()
		});
		try {
			await promise;
			afterDraftGone(before);
		} finally {
			saver.resume();
		}
	}

	/**
	 * The draft is gone (discarded or sent). The editor empties, unless the reviewer typed while
	 * that was on its way: then what they typed stays, and is saved as a new draft.
	 */
	function afterDraftGone(before: string) {
		if (editorSnapshot() === before) {
			resetEditor();
			return;
		}
		dropLegacyDraft();
		goneUpdatedAt = Math.max(storedUpdatedAt ?? 0, saver.knownUpdatedAt ?? 0);
		editorVersion = undefined;
		saver.acknowledge(null);
	}

	function resetEditor() {
		dropLegacyDraft();
		goneUpdatedAt = Math.max(storedUpdatedAt ?? 0, saver.knownUpdatedAt ?? 0);
		reviewComments.set(getEmptyTipTapDocument());
		editorVersion = undefined;
		saver.reset();
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
		if (draftVerdict) return;
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
		// A save on its way would otherwise store the draft again after the review deleted it.
		await saver.settle();
		const before = editorSnapshot();
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
			// The review is out; the server deleted the draft along with it.
			afterDraftGone(before);

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
		} finally {
			isSubmitting = false;
			// After a refused submission, edits that waited are saved again; after a sent review
			// the saver was reset and has nothing left.
			saver.resume();
		}
	};
</script>

<svelte:window onbeforeunload={warnUnsaved} />

<div id="review" class="card bg-base-200 p-4 flex flex-col gap-4 scroll-mt-20">
	<h2 class="text-lg font-bold">{m.addReview()}</h2>

	<ReviewDraftNotices
		{notice}
		{staleWarning}
		changed={changedDraft}
		onLoadNew={loadStoredDraft}
		onKeepMine={keepMine}
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
			saveState={saver.state}
			hasDraft={hasDraft || legacyPending}
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
