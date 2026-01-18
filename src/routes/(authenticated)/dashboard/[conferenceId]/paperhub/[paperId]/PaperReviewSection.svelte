<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cache, graphql, type PaperStatus$options } from '$houdini';
	import { writable, get } from 'svelte/store';
	import toast from 'svelte-french-toast';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import PaperEditor from '$lib/components/Paper/Editor';
	import { translatePaperStatus } from '$lib/services/enumTranslations';
	import { getPaperStatusIcon } from '$lib/services/enumIcons';
	import { VersionCompareModal, computeDiffStats } from '$lib/components/Paper/Editor/DiffViewer';
	import type {
		ComparisonState,
		VersionForComparison,
		DiffStats
	} from '$lib/components/Paper/Editor/DiffViewer';
	import { SvelteMap } from 'svelte/reactivity';
	import { getStatusBadgeClass } from '$lib/services/paperStatusHelpers';
	import { PieceFoundModal } from '$lib/components/FlagCollection';
	import Modal from '$lib/components/Modal.svelte';
	import { getEmptyTipTapDocument } from '$lib/components/Paper/Editor/contentValidation';
	import { browser } from '$app/environment';
	import { persisted } from 'svelte-persisted-store';
	import { onMount } from 'svelte';

	// Check if TipTap JSON content has any actual text
	const hasContent = (content: any): boolean => {
		if (!content) return false;

		const checkNode = (node: any): boolean => {
			if (!node) return false;

			// Check for text node with non-empty content
			if (node.type === 'text' && node.text?.trim()) {
				return true;
			}

			// Recursively check child nodes
			if (node.content && Array.isArray(node.content)) {
				return node.content.some(checkNode);
			}

			return false;
		};

		return checkNode(content);
	};

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

	interface Version {
		id: string;
		version: number;
		content?: any;
		createdAt: string;
		status?: PaperStatus$options | null;
		reviews: Review[];
	}

	interface SnippetItem {
		id: string;
		name: string;
		content: any;
	}

	interface Props {
		paperId: string;
		currentStatus: PaperStatus$options;
		existingReviews: Review[];
		versions?: Version[];
		authorName?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
		paperContainer?: HTMLElement | null;
		snippets?: SnippetItem[];
	}

	let {
		paperId,
		currentStatus,
		existingReviews,
		versions = [],
		authorName = '',
		quoteToInsert,
		onQuoteInserted,
		paperContainer = null,
		snippets = []
	}: Props = $props();

	// Types for draft persistence
	interface ReviewDraft {
		comments: any;
		selectedStatus: PaperStatus$options;
		savedAt: number;
	}

	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

	// State for recovery modal
	let showRecoveryModal = $state(false);
	let savedDraft: ReviewDraft | null = $state(null);

	// Helper to format relative time
	function formatRelativeTime(timestamp: number | undefined): string {
		if (!timestamp) return '';
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return m.timeAgoSeconds({ count: seconds });
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return m.timeAgoMinutes({ count: minutes });
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return m.timeAgoHours({ count: hours });
		const days = Math.floor(hours / 24);
		return m.timeAgoDays({ count: days });
	}

	// Create persisted store for this paper's review draft (only on browser)
	const draftStore = browser
		? persisted<ReviewDraft | null>(`reviewDraft_${paperId}`, null)
		: null;

	// Check for existing draft SYNCHRONOUSLY before render
	if (browser && draftStore) {
		const storedDraft = get(draftStore);
		if (storedDraft) {
			// Check if draft is expired (older than 7 days)
			if (Date.now() - storedDraft.savedAt > SEVEN_DAYS_MS) {
				draftStore.set(null);
			} else {
				// Valid draft found - set state for modal
				savedDraft = storedDraft;
				showRecoveryModal = true;
			}
		}
	}

	// Create unified timeline from versions and reviews
	type TimelineEvent =
		| { type: 'version'; date: Date; version: Version }
		| { type: 'review'; date: Date; review: Review };

	let timelineEvents = $derived.by(() => {
		const events: TimelineEvent[] = [];

		// Add all versions to timeline
		for (const version of versions) {
			events.push({
				type: 'version',
				date: new Date(version.createdAt),
				version
			});
		}

		// Add reviews
		for (const review of existingReviews) {
			events.push({
				type: 'review',
				date: new Date(review.createdAt),
				review
			});
		}

		// Sort by date descending (newest first)
		return events.sort((a, b) => b.date.getTime() - a.date.getTime());
	});

	// Version comparison state
	let comparisonState = $state<ComparisonState>({
		baseVersion: null,
		compareVersion: null,
		isSelecting: false
	});
	let showCompareModal = $state(false);

	// Compute diff stats for each version compared to its previous version
	let versionStats = $derived.by(() => {
		if (!versions || versions.length < 2) return new SvelteMap<string, DiffStats>();

		const sortedVersions = [...versions].sort((a, b) => a.version - b.version);
		const statsMap = new SvelteMap<string, DiffStats>();

		for (let i = 1; i < sortedVersions.length; i++) {
			const prevVersion = sortedVersions[i - 1];
			const currVersion = sortedVersions[i];
			// Need to fetch content - check if it exists on the version object
			if (prevVersion.content && currVersion.content) {
				const stats = computeDiffStats(prevVersion.content, currVersion.content);
				statsMap.set(currVersion.id, stats);
			}
		}

		return statsMap;
	});

	const handleCompareClick = (version: VersionForComparison) => {
		if (!comparisonState.isSelecting) {
			comparisonState = {
				baseVersion: version,
				compareVersion: null,
				isSelecting: true
			};
		} else {
			// Ignore if same version is selected twice
			if (comparisonState.baseVersion?.id === version.id) {
				return;
			}
			comparisonState = {
				...comparisonState,
				compareVersion: version,
				isSelecting: false
			};
			showCompareModal = true;
		}
	};

	const cancelComparison = () => {
		comparisonState = {
			baseVersion: null,
			compareVersion: null,
			isSelecting: false
		};
	};

	// Review form state
	let reviewComments = writable<any>(getEmptyTipTapDocument());
	let selectedStatus = $state<PaperStatus$options>(currentStatus);
	let isSubmitting = $state(false);
	let showConfirmModal = $state(false);
	// Key to force editor remount when restoring draft
	let editorKey = $state(0);

	// Recovery functions
	function restoreDraft() {
		if (savedDraft) {
			reviewComments.set(savedDraft.comments);
			selectedStatus = savedDraft.selectedStatus;
			// Increment key to force editor remount with new content
			editorKey++;
		}
		showRecoveryModal = false;
	}

	function startFresh() {
		if (draftStore) {
			draftStore.set(null);
		}
		showRecoveryModal = false;
	}

	// Auto-save: Use interval-based polling for TipTap content
	let saveInterval: ReturnType<typeof setInterval>;
	let lastSavedContent: string | null = null;

	// Function to save current content to localStorage
	function saveCurrentDraft() {
		if (!browser || !draftStore || showRecoveryModal) return;

		const rawContent = get(reviewComments);

		// Skip if content is empty
		if (!hasContent(rawContent)) {
			return;
		}

		// Stringify to create a plain JSON snapshot
		let contentString: string;
		try {
			contentString = JSON.stringify(rawContent);
		} catch (e) {
			return;
		}

		// Skip if content hasn't changed
		if (contentString === lastSavedContent) {
			return;
		}
		lastSavedContent = contentString;

		draftStore.set({
			comments: JSON.parse(contentString),
			selectedStatus,
			savedAt: Date.now()
		});
	}

	// Set up auto-save interval when component mounts
	onMount(() => {
		if (!browser || !draftStore) return;

		// Poll every second for changes
		saveInterval = setInterval(() => {
			if (!showRecoveryModal) {
				saveCurrentDraft();
			}
		}, 1000);

		return () => {
			if (saveInterval) clearInterval(saveInterval);
		};
	});

	// Safety net: save on page unload
	$effect(() => {
		if (!browser || !draftStore) return;

		const handleBeforeUnload = () => {
			saveCurrentDraft();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	const createReviewMutation = graphql(`
		mutation CreatePaperReview($paperId: String!, $comments: Json!, $newStatus: PaperStatus!) {
			createPaperReview(paperId: $paperId, comments: $comments, newStatus: $newStatus) {
				pieceUnlocked
				unlockedPieceData {
					flagId
					flagName
					flagType
					flagAlpha2Code
					flagAlpha3Code
					fontAwesomeIcon
					pieceName
					foundCount
					totalCount
					isComplete
				}
			}
		}
	`);

	// Piece found modal state
	let showPieceFoundModal = $state(false);
	let pieceFoundData = $state<{
		flagName: string;
		flagAlpha2Code: string | null;
		flagAlpha3Code: string | null;
		flagType: 'NATION' | 'NSA';
		fontAwesomeIcon: string | null;
		pieceName: string;
		isComplete: boolean;
		foundCount: number;
		totalCount: number;
	} | null>(null);

	// Available status options for reviews (both options always available for reviewable statuses)
	let availableTransitions = $derived.by(() => {
		// Only allow reviews on papers that have been submitted
		if (currentStatus === 'DRAFT') {
			return [];
		}
		return [
			{ value: 'CHANGES_REQUESTED', label: m.paperStatusChangesRequested() },
			{ value: 'ACCEPTED', label: m.paperStatusAccepted() }
		];
	});

	// Set initial selected status to first available transition
	$effect(() => {
		if (availableTransitions.length > 0 && selectedStatus === currentStatus) {
			selectedStatus = availableTransitions[0].value as PaperStatus$options;
		}
	});

	const openConfirmModal = () => {
		const comments = $reviewComments;
		if (!hasContent(comments)) {
			toast.error(m.reviewCommentsRequired());
			return;
		}
		showConfirmModal = true;
	};

	const handleSubmitReview = async () => {
		if (isSubmitting) return;

		showConfirmModal = false;
		isSubmitting = true;
		try {
			const result = await toast.promise(
				createReviewMutation.mutate({
					paperId,
					comments: $reviewComments,
					newStatus: selectedStatus
				}),
				{
					loading: m.submittingReview(),
					success: m.reviewSubmitted(),
					error: (err) => err.message || m.reviewSubmitError()
				}
			);

			// Check if a piece was unlocked and show the modal
			const data = result.data?.createPaperReview;
			if (data?.pieceUnlocked && data.unlockedPieceData) {
				pieceFoundData = {
					flagName: data.unlockedPieceData.flagName,
					flagAlpha2Code: data.unlockedPieceData.flagAlpha2Code ?? null,
					flagAlpha3Code: data.unlockedPieceData.flagAlpha3Code ?? null,
					flagType: data.unlockedPieceData.flagType,
					fontAwesomeIcon: data.unlockedPieceData.fontAwesomeIcon ?? null,
					pieceName: data.unlockedPieceData.pieceName,
					isComplete: data.unlockedPieceData.isComplete,
					foundCount: data.unlockedPieceData.foundCount,
					totalCount: data.unlockedPieceData.totalCount
				};
				showPieceFoundModal = true;
			}

			// Clear form and localStorage draft
			reviewComments.set(getEmptyTipTapDocument());
			if (draftStore) {
				draftStore.set(null);
			}

			// Reload data
			cache.markStale();
			await invalidateAll();
		} finally {
			isSubmitting = false;
		}
	};
</script>

<!-- Draft Recovery Modal -->
<Modal bind:open={showRecoveryModal} title={m.paperDraftRecoveryTitle()}>
	<p class="mb-2">{m.paperDraftRecoveryMessage()}</p>
	<p class="text-sm text-base-content/70">
		{m.paperDraftSavedAgo({ time: formatRelativeTime(savedDraft?.savedAt) })}
	</p>
	{#snippet action()}
		<button class="btn" onclick={startFresh}>{m.paperStartFresh()}</button>
		<button class="btn btn-primary" onclick={restoreDraft}>{m.paperRestoreDraft()}</button>
	{/snippet}
</Modal>

<div class="card bg-base-200 p-4 flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.addReview()}</h3>

	{#if availableTransitions.length === 0}
		<div class="alert alert-info">
			<i class="fa-solid fa-info-circle"></i>
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
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
			<legend class="fieldset-legend">{m.newStatus()}</legend>
			<div class="flex w-full gap-2">
				{#each availableTransitions as transition}
					{@const isSelected = selectedStatus === transition.value}
					{@const isChangesRequested = transition.value === 'CHANGES_REQUESTED'}
					<label class="flex-1 cursor-pointer">
						<input
							type="radio"
							name="status_tabs"
							class="hidden"
							checked={isSelected}
							onchange={() => (selectedStatus = transition.value as PaperStatus$options)}
						/>
						<div
							class="btn w-full {isSelected
								? isChangesRequested
									? 'btn-warning'
									: 'btn-success'
								: 'btn-ghost'}"
						>
							<i class="fa-solid {getPaperStatusIcon(transition.value as PaperStatus$options)}"></i>
							{transition.label}
						</div>
					</label>
				{/each}
			</div>
		</fieldset>

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

<!-- History Timeline -->
{#if timelineEvents.length > 0}
	<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
		<legend class="fieldset-legend">{m.history()}</legend>
		<ul class="timeline timeline-vertical timeline-compact py-2">
			{#each timelineEvents as event, index (event.type === 'review' ? event.review.id : event.version.id)}
				<li class="">
					{#if index > 0}
						<hr class="bg-base-300" />
					{/if}
					<div
						class="timeline-start text-xs text-base-content/60 text-right pr-4 whitespace-nowrap"
					>
						{event.date.toLocaleDateString()} · {event.date.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit'
						})}
					</div>
					<div class="timeline-middle">
						<i class="fa-solid fa-circle-chevron-right text-primary text-lg w-5 text-center"></i>
					</div>
					<div class="timeline-end timeline-box bg-base-100 w-full p-3 mb-4">
						{#if event.type === 'version'}
							{@const stats = versionStats.get(event.version.id)}
							<!-- Version submission event -->
							<div class="flex flex-wrap justify-between items-center gap-2">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-file-arrow-up text-secondary"></i>
									<span class="font-semibold">
										{m.versionSubmitted({ version: event.version.version.toString() })}
									</span>
									{#if stats}
										<span class="text-xs font-mono">
											<span class="text-success">+{stats.added}</span>
											<span class="text-error">-{stats.removed}</span>
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if event.version.status}
										<div class="badge {getStatusBadgeClass(event.version.status)} badge-sm gap-1">
											<i class="fa-solid {getPaperStatusIcon(event.version.status)} text-xs"></i>
											{translatePaperStatus(event.version.status)}
										</div>
									{/if}
									{#if versions.length > 1}
										<button
											class="btn btn-xs btn-ghost {comparisonState.baseVersion?.id ===
											event.version.id
												? 'btn-active'
												: ''}"
											onclick={() => handleCompareClick(event.version)}
											title={m.compareVersion()}
										>
											<i class="fa-solid fa-code-compare"></i>
										</button>
									{/if}
								</div>
							</div>
						{:else}
							<!-- Review event -->
							<div class="flex flex-wrap justify-between items-start gap-2 mb-3">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-user-pen text-base-content/50"></i>
									<span class="font-semibold">
										{event.review.reviewer.given_name}
										{event.review.reviewer.family_name}
									</span>
								</div>
								{#if event.review.statusBefore && event.review.statusAfter}
									<div class="flex items-center gap-1">
										<div
											class="badge {getStatusBadgeClass(event.review.statusBefore)} badge-sm gap-1"
										>
											<i class="fa-solid {getPaperStatusIcon(event.review.statusBefore)} text-xs"
											></i>
											{translatePaperStatus(event.review.statusBefore)}
										</div>
										<i class="fa-solid fa-arrow-right text-xs text-base-content/50"></i>
										<div
											class="badge {getStatusBadgeClass(event.review.statusAfter)} badge-sm gap-1"
										>
											<i class="fa-solid {getPaperStatusIcon(event.review.statusAfter)} text-xs"
											></i>
											{translatePaperStatus(event.review.statusAfter)}
										</div>
									</div>
								{/if}
							</div>
							<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-2">
								<legend class="fieldset-legend text-xs">{m.reviewComments()}</legend>
								<PaperEditor.ReadOnlyContent content={event.review.comments} {paperContainer} />
							</fieldset>
						{/if}
					</div>
					{#if index < timelineEvents.length - 1}
						<hr class="bg-base-300" />
					{/if}
				</li>
			{/each}
		</ul>
	</fieldset>
{/if}

<!-- Version comparison selection indicator -->
{#if comparisonState.isSelecting}
	<div class="alert alert-info fixed bottom-4 right-4 z-50 w-auto max-w-sm shadow-lg">
		<i class="fa-solid fa-code-compare"></i>
		<span>{m.selectSecondVersionToCompare()}</span>
		<button class="btn btn-sm btn-ghost" onclick={cancelComparison}>
			<i class="fa-solid fa-xmark"></i>
		</button>
	</div>
{/if}

<!-- Version Compare Modal -->
{#if comparisonState.baseVersion && comparisonState.compareVersion}
	<VersionCompareModal
		bind:open={showCompareModal}
		baseVersion={comparisonState.baseVersion}
		compareVersion={comparisonState.compareVersion}
	/>
{/if}

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
			const conferenceId = $page.params.conferenceId;
			goto(`/dashboard/${conferenceId}/paperhub#flag-collection`);
		}}
	/>
{/if}
