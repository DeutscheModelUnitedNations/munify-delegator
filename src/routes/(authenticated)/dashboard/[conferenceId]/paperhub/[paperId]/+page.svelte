<script lang="ts">
	import type { PageData } from './$houdini';
	import PaperEditor from '$lib/components/Paper/Editor';
	import { editorContentStore } from '$lib/components/Paper/Editor/editorStore';
	import { compareEditorContentHash } from '$lib/components/Paper/Editor/contentHash';
	import { translatePaperStatus, translatePaperType } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import InfoChip from './InfoChip.svelte';
	import { getPaperStatusIcon, getPaperTypeIcon } from '$lib/services/enumIcons';
	import type { PaperStatus$options } from '$houdini';
	import { VersionCompareModal, computeDiffStats } from '$lib/components/Paper/Editor/DiffViewer';
	import type {
		ComparisonState,
		VersionForComparison,
		DiffStats
	} from '$lib/components/Paper/Editor/DiffViewer';
	import { SvelteMap } from 'svelte/reactivity';
	import { getStatusBadgeClass } from '$lib/services/paperStatusHelpers';
	import { cache, graphql } from '$houdini';
	import toast from 'svelte-french-toast';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import PaperReviewSection from './PaperReviewSection.svelte';

	const updatePaperMutation = graphql(`
		mutation UpdatePaperMutation($paperId: String!, $content: Json!, $status: PaperStatus) {
			updateOnePaper(where: { paperId: $paperId }, data: { content: $content, status: $status }) {
				id
			}
		}
	`);

	const deletePaperMutation = graphql(`
		mutation DeletePaperMutation($paperId: String!) {
			deleteOnePaper(where: { id: $paperId }) {
				id
			}
		}
	`);

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.getPaperDetailsForEditingQuery);
	let paperData = $derived($paperQuery?.data?.findUniquePaper);

	// View mode detection
	let isAuthor = $derived(paperData?.author.id === data.user.sub);
	let isReviewer = $derived((data.teamMembers?.length ?? 0) > 0);
	let baseViewMode = $derived<'author' | 'reviewer'>(
		isAuthor ? 'author' : isReviewer ? 'reviewer' : 'author'
	);

	// Edit mode toggle for reviewers
	let reviewerEditMode = $state(false);
	let editorEditable = $derived(baseViewMode === 'author' || reviewerEditMode);

	let initialized = $state(false);
	let currentPaperId = $state<string | null>(null);

	// Reset and reinitialize when paper changes (handles client-side navigation)
	$effect(() => {
		if (paperData && paperData.id !== currentPaperId) {
			if (!paperData.versions || paperData.versions.length === 0) {
				$editorContentStore = '';
				currentPaperId = paperData.id;
				initialized = true;
				return;
			}
			const latestVer = paperData.versions.reduce((acc, version) =>
				version.version > acc.version ? version : acc
			);
			$editorContentStore = latestVer.content;
			currentPaperId = paperData.id;
			initialized = true;
		}
	});

	let title = $derived(
		paperData?.agendaItem?.title
			? `${paperData.agendaItem.committee.abbreviation}: ${paperData.agendaItem.title}`
			: `${translatePaperType(paperData.type)}`
	);
	let nation = $derived(paperData.delegation.assignedNation);
	let nsa = $derived(paperData.delegation.assignedNonStateActor);
	let versionNumber = $derived(
		paperData.versions.reduce((acc, version) => (version.version > acc.version ? version : acc))
			.version
	);
	let latestVersion = $derived(
		paperData.versions.find((version) => version.version === versionNumber)
	);
	let existingReviews = $derived(paperData.versions.flatMap((version) => version.reviews ?? []));

	let unsavedChanges = $state(false);

	// Version comparison state
	let comparisonState = $state<ComparisonState>({
		baseVersion: null,
		compareVersion: null,
		isSelecting: false
	});
	let showCompareModal = $state(false);

	// Compute diff stats for each version compared to its previous version
	let versionStats = $derived.by(() => {
		if (!paperData?.versions || paperData.versions.length < 2)
			return new SvelteMap<string, DiffStats>();

		const sortedVersions = [...paperData.versions].sort((a, b) => a.version - b.version);
		const statsMap = new SvelteMap<string, DiffStats>();

		for (let i = 1; i < sortedVersions.length; i++) {
			const prevVersion = sortedVersions[i - 1];
			const currVersion = sortedVersions[i];
			const stats = computeDiffStats(prevVersion.content, currVersion.content);
			statsMap.set(currVersion.id, stats);
		}

		return statsMap;
	});

	const handleCompareClick = (version: VersionForComparison) => {
		if (!comparisonState.isSelecting) {
			// First selection - set as base
			comparisonState = {
				baseVersion: version,
				compareVersion: null,
				isSelecting: true
			};
		} else {
			// Prevent selecting the same version twice
			if (comparisonState.baseVersion?.id === version.id) {
				return;
			}
			// Second selection - set as compare and open modal
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

	$effect(() => {
		if (paperData && $editorContentStore) {
			compareEditorContentHash(
				JSON.stringify($editorContentStore),
				latestVersion?.contentHash
			).then((areEqual) => {
				unsavedChanges = !areEqual;
			});
		}
	});

	const saveFile = async (options: { submit?: boolean } = {}) => {
		const { submit = false } = options;

		// Determine status: reviewers keep current status, authors change to SUBMITTED/DRAFT
		const newStatus = reviewerEditMode ? paperData.status : submit ? 'SUBMITTED' : 'DRAFT';

		const resposne = await toast.promise(
			updatePaperMutation.mutate({
				paperId: paperData.id,
				content: $editorContentStore,
				status: newStatus
			}),
			{
				loading: submit ? m.paperSubmitting() : m.paperSavingDraft(),
				success: submit ? m.paperSubmittedSuccessfully() : m.paperDraftSavedSuccessfully(),
				error: submit ? m.paperSubmitError() : m.paperSaveDraftError()
			}
		);

		cache.markStale();
		await invalidateAll();
	};

	// Quote selection state for reviewers
	let quoteToInsert = $state<string | null>(null);

	const handleQuoteSelection = (text: string) => {
		quoteToInsert = text;
	};

	const clearQuote = () => {
		quoteToInsert = null;
	};

	// Paper editor container reference for cite navigation
	let paperEditorContainer = $state<HTMLElement | null>(null);

	// Danger Zone state
	let showDangerZone = $state(false);
	let deleteConfirmationText = $state('');
	let entityName = $derived(
		nation ? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code) : (nsa?.name ?? '')
	);
	let deleteConfirmationExpected = $derived(`${title} - ${entityName}`);

	const handleDeletePaper = async () => {
		if (deleteConfirmationText !== deleteConfirmationExpected) {
			toast.error(m.paperDeleteConfirmationMismatch());
			return;
		}

		await toast.promise(
			deletePaperMutation.mutate({
				paperId: paperData.id
			}),
			{
				loading: m.paperDeleting(),
				success: m.paperDeletedSuccessfully(),
				error: (err) => err.message || m.paperDeleteError()
			}
		);

		// Navigate back to paperhub
		const conferenceId = $page.params.conferenceId;
		goto(`/dashboard/${conferenceId}/paperhub`);
	};
</script>

<div class="flex flex-col gap-2 w-full">
	{#if paperData}
		<div class="flex flex-row items-center gap-2 flex-wrap">
			<InfoChip
				icon={getPaperTypeIcon(paperData.type)}
				textContent={translatePaperType(paperData.type)}
			/>
			<InfoChip
				textContent={nation
					? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
					: nsa.name}
			>
				{#snippet startContent()}
					<Flag size="xs" alpha2Code={nation?.alpha2Code} {nsa} icon={nsa?.fontAwesomeIcon} />
				{/snippet}
			</InfoChip>
			<InfoChip
				icon={getPaperStatusIcon(paperData.status)}
				textContent={translatePaperStatus(paperData.status)}
			/>
			<InfoChip icon="fa-clock-rotate-left" textContent={m.version()}>
				{#snippet endContent()}
					<div class="badge font-bold font-mono">{versionNumber}</div>
				{/snippet}
			</InfoChip>
		</div>

		<h2 class="text-2xl font-bold bg-base-200 border-base-300 border-1 rounded-box p-2">
			{title}
		</h2>

		<div class="flex flex-row items-center gap-2 flex-wrap">
			<InfoChip
				icon="fa-plus"
				textContent={paperData.createdAt?.toLocaleDateString()}
				tooltip={m.createdAt()}
			/>
			<InfoChip
				icon="fa-pen"
				textContent={paperData.updatedAt?.toLocaleDateString()}
				tooltip={m.updatedAt()}
			/>
			<InfoChip
				icon="fa-inbox"
				textContent={paperData.firstSubmittedAt?.toLocaleDateString() ?? m.notYetSubmitted()}
				tooltip={m.submittedAt()}
			/>
		</div>
		<!-- Action buttons -->
		<div class="flex flex-wrap gap-2">
			{#if baseViewMode === 'author' || reviewerEditMode}
				<div class="join join-vertical md:join-horizontal">
					{#if paperData.status === 'DRAFT'}
						<button
							class="btn btn-warning join-item"
							onclick={() => saveFile()}
							disabled={!unsavedChanges}
						>
							<i class="fa-solid fa-pencil"></i>
							{m.paperSaveDraft()}
						</button>
					{/if}
					<button
						class="btn btn-primary join-item"
						onclick={() => saveFile({ submit: true })}
						disabled={!unsavedChanges && paperData.status !== 'DRAFT'}
					>
						<i class="fa-solid fa-paper-plane"></i>
						{paperData.status === 'DRAFT' ? m.paperSubmit() : m.paperResubmit()}
					</button>
				</div>
			{/if}

			{#if isReviewer && baseViewMode === 'reviewer'}
				<button
					class="btn {reviewerEditMode ? 'btn-warning' : 'btn-outline'}"
					onclick={() => (reviewerEditMode = !reviewerEditMode)}
				>
					<i class="fa-solid {reviewerEditMode ? 'fa-eye' : 'fa-pen-to-square'}"></i>
					{reviewerEditMode ? m.viewer() : m.edit()}
				</button>
			{/if}
		</div>
	{:else}
		<div>
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}
	{#if initialized}
		<div class="w-full flex flex-col gap-4">
			<!-- Paper Editor - key forces re-creation when editable changes -->
			<div bind:this={paperEditorContainer}>
				{#key editorEditable}
					{#if paperData.type === 'WORKING_PAPER'}
						<PaperEditor.ResolutionFormat
							editable={editorEditable}
							onQuoteSelection={baseViewMode === 'reviewer' ? handleQuoteSelection : undefined}
						/>
					{:else}
						<PaperEditor.PaperFormat
							editable={editorEditable}
							onQuoteSelection={baseViewMode === 'reviewer' ? handleQuoteSelection : undefined}
						/>
					{/if}
				{/key}
			</div>

			<!-- Review section for reviewers -->
			{#if baseViewMode === 'reviewer'}
				<PaperReviewSection
					paperId={paperData.id}
					currentStatus={paperData.status}
					{existingReviews}
					versions={paperData.versions}
					quoteToInsert={quoteToInsert ?? undefined}
					onQuoteInserted={clearQuote}
					paperContainer={paperEditorContainer}
				/>
			{/if}

			<!-- History for authors (versions + reviews) -->
			{#if baseViewMode === 'author' && (paperData.versions.length > 0 || existingReviews.length > 0)}
				{@const authorTimelineEvents = [
					...paperData.versions.map((v) => ({
						type: 'version' as const,
						date: new Date(v.createdAt),
						version: v
					})),
					...existingReviews.map((r) => ({
						type: 'review' as const,
						date: new Date(r.createdAt),
						review: r
					}))
				].sort((a, b) => b.date.getTime() - a.date.getTime())}

				<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
					<legend class="fieldset-legend">{m.history()}</legend>
					<ul class="timeline timeline-vertical timeline-compact py-2">
						{#each authorTimelineEvents as event, index}
							<li>
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
									<i class="fa-solid fa-circle-chevron-right text-primary text-lg"></i>
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
													<div
														class="badge {getStatusBadgeClass(event.version.status)} badge-sm gap-1"
													>
														<i class="fa-solid {getPaperStatusIcon(event.version.status)} text-xs"
														></i>
														{translatePaperStatus(event.version.status)}
													</div>
												{/if}
												{#if paperData.versions.length > 1}
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
														class="badge {getStatusBadgeClass(
															event.review.statusBefore
														)} badge-sm gap-1"
													>
														<i
															class="fa-solid {getPaperStatusIcon(
																event.review.statusBefore
															)} text-xs"
														></i>
														{translatePaperStatus(event.review.statusBefore)}
													</div>
													<i class="fa-solid fa-arrow-right text-xs text-base-content/50"></i>
													<div
														class="badge {getStatusBadgeClass(
															event.review.statusAfter
														)} badge-sm gap-1"
													>
														<i
															class="fa-solid {getPaperStatusIcon(
																event.review.statusAfter
															)} text-xs"
														></i>
														{translatePaperStatus(event.review.statusAfter)}
													</div>
												</div>
											{/if}
										</div>
										<fieldset
											class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-2"
										>
											<legend class="fieldset-legend text-xs">{m.reviewComments()}</legend>
											<PaperEditor.ReadOnlyContent
												content={event.review.comments}
												paperContainer={paperEditorContainer}
											/>
										</fieldset>
									{/if}
								</div>
								{#if index < authorTimelineEvents.length - 1}
									<hr class="bg-base-300" />
								{/if}
							</li>
						{/each}
					</ul>
				</fieldset>
			{/if}
		</div>
	{:else}
		<div class="mt-6 w-full h-12 skeleton"></div>
	{/if}

	<!-- Hidden Danger Zone (team members only) -->
	{#if paperData && isReviewer}
		<div class="mt-8">
			<button
				class="btn btn-ghost btn-sm text-base-content/40 hover:text-error"
				onclick={() => (showDangerZone = !showDangerZone)}
			>
				<i class="fa-solid {showDangerZone ? 'fa-chevron-down' : 'fa-chevron-right'}"></i>
				{m.dangerZone()}
			</button>

			{#if showDangerZone}
				<div class="mt-2 border border-error/30 rounded-box p-4 bg-error/5">
					<div class="flex items-center gap-2 text-error mb-3">
						<i class="fa-solid fa-triangle-exclamation text-lg"></i>
						<h3 class="font-bold">{m.paperDeleteTitle()}</h3>
					</div>

					<p class="text-sm text-base-content/70 mb-4">
						{m.paperDeleteWarning()}
					</p>

					<div class="form-control mb-4">
						<label class="label" for="delete-confirmation">
							<span class="label-text text-sm">{m.paperDeleteConfirmation()}</span>
						</label>
						<div class="text-xs text-base-content/50 mb-2 font-mono bg-base-200 p-2 rounded">
							{deleteConfirmationExpected}
						</div>
						<input
							id="delete-confirmation"
							type="text"
							class="input input-bordered input-error w-full"
							placeholder={deleteConfirmationExpected}
							bind:value={deleteConfirmationText}
						/>
					</div>

					<button
						class="btn btn-error"
						disabled={deleteConfirmationText !== deleteConfirmationExpected}
						onclick={handleDeletePaper}
					>
						<i class="fa-solid fa-trash"></i>
						{m.paperDeleteButton()}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if unsavedChanges}
	<div class="fixed top-4 right-4 z-50">
		<div
			class="bg-warning p-4 rounded-box shadow-lg tooltip tooltip-left tooltip-warning"
			data-tip={m.paperNotSavedAlert()}
		>
			<i class="fa-solid fa-exclamation-triangle fa-beat-fade text-4xl"></i>
		</div>
	</div>
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
