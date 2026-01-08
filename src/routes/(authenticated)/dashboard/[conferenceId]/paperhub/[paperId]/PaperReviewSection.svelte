<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cache, graphql, type PaperStatus$options } from '$houdini';
	import { writable } from 'svelte/store';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
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

	// Status colors for badges
	const getStatusBadgeClass = (status: PaperStatus$options) => {
		switch (status) {
			case 'SUBMITTED':
				return 'badge-warning';
			case 'CHANGES_REQUESTED':
				return 'badge-error';
			case 'ACCEPTED':
				return 'badge-success';
			default:
				return 'badge-ghost';
		}
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

	interface Props {
		paperId: string;
		currentStatus: PaperStatus$options;
		existingReviews: Review[];
		versions?: Version[];
		authorName?: string;
		quoteToInsert?: string;
		onQuoteInserted?: () => void;
	}

	let {
		paperId,
		currentStatus,
		existingReviews,
		versions = [],
		authorName = '',
		quoteToInsert,
		onQuoteInserted
	}: Props = $props();

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
		cache.markStale();
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
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
			<legend class="fieldset-legend">{m.newStatus()}</legend>
			<select class="select select-bordered w-full" bind:value={selectedStatus}>
				{#each availableTransitions as transition}
					<option value={transition.value}>{transition.label}</option>
				{/each}
			</select>
		</fieldset>

		<!-- Comments Editor -->
		<PaperEditor.ReviewFormat contentStore={reviewComments} {quoteToInsert} {onQuoteInserted} />

		<!-- Submit Button -->
		<button class="btn btn-primary" onclick={handleSubmitReview}>
			<i class="fa-solid fa-paper-plane"></i>
			{m.submitReview()}
		</button>
	{/if}
</div>

<!-- History Timeline -->
{#if timelineEvents.length > 0}
	<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
		<legend class="fieldset-legend">{m.history()}</legend>
		<ul class="timeline timeline-vertical timeline-compact py-2">
			{#each timelineEvents as event, index}
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
								<PaperEditor.ReadOnlyContent content={event.review.comments} />
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
