<script lang="ts">
	import { client, type PaperstatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import PaperEditor from '$lib/components/paper/editor';
	import { VersionCompareModal, computeDiffStats } from '$lib/components/paper/editor/diffViewer';
	import type {
		ComparisonState,
		VersionForComparison,
		DiffStats
	} from '$lib/components/paper/editor/diffViewer';
	import { translatePaperStatus } from '$lib/utils/enumTranslations';
	import { getPaperStatusIcon } from '$lib/utils/enumIcons';
	import { getStatusBadgeClass } from '$lib/utils/paperStatusHelpers';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		paperId: string;
		/** The rendered paper, so review comments citing it can scroll to the quoted passage. */
		paperContainer?: HTMLElement | null;
	}

	let { paperId, paperContainer = null }: Props = $props();

	const history = $derived(
		await client.liveQuery.paper({
			__args: { id: paperId },
			id: true,
			versions: {
				id: true,
				version: true,
				content: true,
				createdAt: true,
				status: true,
				reviews: {
					id: true,
					comments: true,
					createdAt: true,
					statusBefore: true,
					statusAfter: true,
					reviewer: { id: true, givenName: true, familyName: true }
				}
			}
		})
	);

	let versions = $derived(history?.versions ?? []);
	type Version = (typeof versions)[number];
	type Review = Version['reviews'][number];

	// One timeline of version submissions and reviews, newest first.
	let timelineEvents = $derived(
		[
			...versions.map((version) => ({
				type: 'version' as const,
				date: new Date(version.createdAt),
				version
			})),
			...versions.flatMap((version) =>
				version.reviews.map((review) => ({
					type: 'review' as const,
					date: new Date(review.createdAt),
					review
				}))
			)
		].sort((a, b) => b.date.getTime() - a.date.getTime())
	);

	type TimelineEvent = (typeof timelineEvents)[number];

	// Diff stats of each version against the one before it
	let versionStats = $derived.by(() => {
		const statsMap = new SvelteMap<string, DiffStats>();
		const sortedVersions = [...versions].sort((a, b) => a.version - b.version);
		for (let i = 1; i < sortedVersions.length; i++) {
			const prevVersion = sortedVersions[i - 1];
			const currVersion = sortedVersions[i];
			if (prevVersion.content && currVersion.content) {
				statsMap.set(currVersion.id, computeDiffStats(prevVersion.content, currVersion.content));
			}
		}
		return statsMap;
	});

	// Version comparison: the first click picks the base, the second opens the diff.
	let comparisonState = $state<ComparisonState>({
		baseVersion: null,
		compareVersion: null,
		isSelecting: false
	});
	let showCompareModal = $state(false);

	const handleCompareClick = (version: VersionForComparison) => {
		if (!comparisonState.isSelecting) {
			comparisonState = { baseVersion: version, compareVersion: null, isSelecting: true };
			return;
		}
		// Ignore if same version is selected twice
		if (comparisonState.baseVersion?.id === version.id) return;
		comparisonState = { ...comparisonState, compareVersion: version, isSelecting: false };
		showCompareModal = true;
	};

	const cancelComparison = () => {
		comparisonState = { baseVersion: null, compareVersion: null, isSelecting: false };
	};
</script>

{#snippet statusBadge(status: PaperstatusEnum)}
	<div class="badge {getStatusBadgeClass(status)} badge-sm gap-1">
		<i class="fa-solid {getPaperStatusIcon(status)} text-xs"></i>
		{translatePaperStatus(status)}
	</div>
{/snippet}

{#snippet versionEvent(version: Version)}
	{@const stats = versionStats.get(version.id)}
	<!-- Version submission event -->
	<div class="flex flex-wrap justify-between items-center gap-2">
		<div class="flex items-center gap-2">
			<i class="fa-solid fa-file-arrow-up text-secondary"></i>
			<span class="font-semibold">
				{m.versionSubmitted({ version: version.version.toString() })}
			</span>
			{#if stats}
				<span class="text-xs font-mono">
					<span class="text-success">+{stats.added}</span>
					<span class="text-error">-{stats.removed}</span>
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if version.status}
				{@render statusBadge(version.status)}
			{/if}
			{#if versions.length > 1}
				<button
					class="btn btn-xs btn-ghost {comparisonState.baseVersion?.id === version.id
						? 'btn-active'
						: ''}"
					onclick={() => handleCompareClick(version)}
					title={m.compareVersion()}
				>
					<i class="fa-solid fa-code-compare"></i>
				</button>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet reviewEvent(review: Review)}
	<div class="flex flex-wrap justify-between items-start gap-2 mb-3">
		<div class="flex items-center gap-2">
			<i class="fa-solid fa-user-pen text-base-content/50"></i>
			<span class="font-semibold">
				{review.reviewer.givenName}
				{review.reviewer.familyName}
			</span>
		</div>
		{#if review.statusBefore && review.statusAfter}
			<div class="flex items-center gap-1">
				{@render statusBadge(review.statusBefore)}
				<i class="fa-solid fa-arrow-right text-xs text-base-content/50"></i>
				{@render statusBadge(review.statusAfter)}
			</div>
		{/if}
	</div>
	<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-2">
		<legend class="fieldset-legend text-xs">{m.reviewComments()}</legend>
		<PaperEditor.ReadOnlyContent content={review.comments} {paperContainer} />
	</fieldset>
{/snippet}

{#snippet timelineItem(event: TimelineEvent, index: number)}
	<li>
		{#if index > 0}
			<hr class="bg-base-300" />
		{/if}
		<div class="timeline-start text-xs text-base-content/60 text-right pr-4 whitespace-nowrap">
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
				{@render versionEvent(event.version)}
			{:else}
				<!-- Review event -->
				{@render reviewEvent(event.review)}
			{/if}
		</div>
		{#if index < timelineEvents.length - 1}
			<hr class="bg-base-300" />
		{/if}
	</li>
{/snippet}

{#if timelineEvents.length > 0}
	<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
		<legend class="fieldset-legend">{m.history()}</legend>
		<ul class="timeline timeline-vertical timeline-compact py-2">
			{#each timelineEvents as event, index (event.type === 'review' ? event.review.id : event.version.id)}
				{@render timelineItem(event, index)}
			{/each}
		</ul>
	</fieldset>
{/if}

<!-- Version comparison selection indicator -->
{#if comparisonState.isSelecting}
	<div class="alert alert-info fixed bottom-4 right-4 z-50 w-auto max-w-sm shadow-lg">
		<i class="fa-solid fa-code-compare"></i>
		<span>{m.selectSecondVersionToCompare()}</span>
		<button class="btn btn-sm btn-ghost" onclick={cancelComparison} aria-label={m.cancel()}>
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
