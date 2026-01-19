<script lang="ts">
	import type { PageData } from './$houdini';
	import { validateResolution, type ResolutionHeaderData } from '$lib/schemata/resolution';
	import PaperEditor from '$lib/components/Paper/Editor';
	import {
		editorContentStore,
		resolutionContentStore
	} from '$lib/components/Paper/Editor/editorStore';
	import { compareEditorContentHash } from '$lib/components/Paper/Editor/contentHash';
	import { translatePaperStatus, translatePaperType } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
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
	import { toast } from 'svelte-sonner';
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

	// Query for user's reviewer snippets
	const mySnippetsStore = graphql(`
		query MyReviewerSnippetsForPaperQuery {
			myReviewerSnippets {
				id
				name
				content
			}
		}
	`);

	// Fetch snippets on mount
	$effect(() => {
		mySnippetsStore.fetch();
	});

	// Get snippets for reviewers
	let snippets = $derived(
		($mySnippetsStore?.data?.myReviewerSnippets ?? []).map((s) => ({
			id: s.id,
			name: s.name,
			content: s.content as any
		}))
	);

	// View mode detection
	let isAuthor = $derived(paperData?.author.id === data.user.sub);
	let isReviewer = $derived((data.teamMembers?.length ?? 0) > 0);
	let isSupervisor = $derived(
		!!data.supervisedDelegationIds?.includes(paperData?.delegation.id ?? '')
	);
	let baseViewMode = $derived<'author' | 'reviewer' | 'supervisor'>(
		isAuthor ? 'author' : isReviewer ? 'reviewer' : isSupervisor ? 'supervisor' : 'author'
	);

	// Edit mode toggle for reviewers
	let reviewerEditMode = $state(false);
	let editorEditable = $derived(baseViewMode === 'author' || reviewerEditMode);

	let initialized = $state(false);
	let currentPaperId = $state<string | null>(null);
	let resolutionValidationError = $state<string | null>(null);
	let invalidRawContent = $state<unknown>(null);

	// Reset and reinitialize when paper changes (handles client-side navigation)
	$effect(() => {
		if (paperData && paperData.id !== currentPaperId) {
			// Reset validation error and raw content
			resolutionValidationError = null;
			invalidRawContent = null;

			if (!paperData.versions || paperData.versions.length === 0) {
				// Reset both stores, set appropriate one based on paper type
				if (paperData.type === 'WORKING_PAPER') {
					$resolutionContentStore = undefined;
				} else {
					$editorContentStore = '';
				}
				currentPaperId = paperData.id;
				initialized = true;
				return;
			}
			const latestVer = paperData.versions.reduce((acc, version) =>
				version.version > acc.version ? version : acc
			);
			// Set the correct store based on paper type
			if (paperData.type === 'WORKING_PAPER') {
				// Validate working paper content before setting
				const validationResult = validateResolution(latestVer.content);
				if (validationResult.valid) {
					$resolutionContentStore = validationResult.data;
				} else {
					resolutionValidationError = validationResult.error;
					invalidRawContent = latestVer.content;
					$resolutionContentStore = undefined;
				}
			} else {
				$editorContentStore = latestVer.content;
			}
			currentPaperId = paperData.id;
			initialized = true;
		}
	});

	let title = $derived(
		paperData?.agendaItem?.title
			? `${paperData.agendaItem.committee.abbreviation}: ${paperData.agendaItem.title}`
			: paperData?.type
				? `${translatePaperType(paperData.type)}`
				: ''
	);
	let nation = $derived(paperData?.delegation?.assignedNation);
	let nsa = $derived(paperData?.delegation?.assignedNonStateActor);
	let versionNumber = $derived.by(() => {
		const versions = paperData?.versions;
		if (!versions || versions.length === 0) return 0;
		return versions.reduce((acc, version) => (version.version > acc.version ? version : acc))
			.version;
	});
	let latestVersion = $derived(
		paperData?.versions?.find((version) => version.version === versionNumber)
	);
	let existingReviews = $derived(
		paperData?.versions?.flatMap((version) => version.reviews ?? []) ?? []
	);

	// Resolution header data for working papers
	let resolutionHeaderData = $derived.by((): ResolutionHeaderData | undefined => {
		if (paperData?.type !== 'WORKING_PAPER') return undefined;

		const nationName = nation
			? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
			: undefined;
		const nsaName = nsa?.name;
		const year = new Date().getFullYear();

		return {
			conferenceName: paperData.conference?.title ?? 'Model UN',
			conferenceTitle:
				paperData.conference?.longTitle ?? paperData.conference?.title ?? 'Model United Nations',
			committeeAbbreviation: paperData.agendaItem?.committee?.abbreviation,
			committeeFullName: paperData.agendaItem?.committee?.name,
			committeeResolutionHeadline: paperData.agendaItem?.committee?.resolutionHeadline ?? undefined,
			documentNumber: `WP/${year}/${paperData.id.slice(-6)}`,
			topic: paperData.agendaItem?.title,
			authoringDelegation: nationName ?? nsaName,
			conferenceEmblem: paperData.conference?.emblemDataURL ?? undefined
		};
	});

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

	// Get the current content from the correct store based on paper type
	let currentContent = $derived(
		paperData?.type === 'WORKING_PAPER' ? $resolutionContentStore : $editorContentStore
	);

	$effect(() => {
		if (paperData && currentContent) {
			compareEditorContentHash(JSON.stringify(currentContent), latestVersion?.contentHash).then(
				(areEqual) => {
					unsavedChanges = !areEqual;
				}
			);
		}
	});

	const saveFile = async (options: { submit?: boolean } = {}) => {
		if (!paperData) return;

		const { submit = false } = options;

		// Determine status: reviewers keep current status, authors change to SUBMITTED/DRAFT
		const newStatus = reviewerEditMode ? paperData.status : submit ? 'SUBMITTED' : 'DRAFT';

		// Use the correct store based on paper type
		const content =
			paperData.type === 'WORKING_PAPER' ? $resolutionContentStore : $editorContentStore;

		const resposne = await toast.promise(
			updatePaperMutation.mutate({
				paperId: paperData.id,
				content,
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
		if (!paperData) return;

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

	const downloadRawContent = () => {
		if (!invalidRawContent || !paperData) return;

		const jsonString = JSON.stringify(invalidRawContent, null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `paper-${paperData.id}-raw-data.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
</script>

<div class="flex flex-col gap-4 w-full">
	{#if paperData}
		<!-- Paper Header Card -->
		<div class="card bg-base-200 border border-base-300">
			<div class="card-body p-4">
				<!-- Top Row: Country/NSA + Status -->
				<div class="flex items-center justify-between gap-4 flex-wrap">
					<div class="flex items-center gap-3">
						<Flag size="md" alpha2Code={nation?.alpha2Code} {nsa} icon={nsa?.fontAwesomeIcon} />
						<span class="text-lg font-semibold">
							{nation ? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code) : nsa?.name}
						</span>
					</div>
					<div class="badge {getStatusBadgeClass(paperData.status)} badge-lg gap-2">
						<i class="fa-solid {getPaperStatusIcon(paperData.status)}"></i>
						{translatePaperStatus(paperData.status)}
					</div>
				</div>

				<!-- Title -->
				<h1 class="text-2xl font-bold mt-2">{title}</h1>

				<!-- Metadata Row -->
				<div class="flex items-center justify-between gap-3 mt-2 flex-wrap">
					<div class="flex items-center gap-3 text-sm text-base-content/70 flex-wrap">
						<span class="flex items-center gap-1">
							<i class="fa-solid {getPaperTypeIcon(paperData.type)}"></i>
							{translatePaperType(paperData.type)}
						</span>
						<span class="text-base-content/30">•</span>
						<div class="tooltip" data-tip={m.version()}>
							<span class="font-mono">v{versionNumber}</span>
						</div>
						<span class="text-base-content/30">•</span>
						<div class="tooltip" data-tip={m.createdAt()}>
							<span class="flex items-center gap-1">
								<i class="fa-solid fa-plus text-xs"></i>
								{paperData.createdAt?.toLocaleDateString()}
							</span>
						</div>
						{#if paperData.firstSubmittedAt}
							<span class="text-base-content/30">•</span>
							<div class="tooltip" data-tip={m.submittedAt()}>
								<span class="flex items-center gap-1">
									<i class="fa-solid fa-paper-plane text-xs"></i>
									{paperData.firstSubmittedAt?.toLocaleDateString()}
								</span>
							</div>
						{/if}
					</div>
					<a
						href={`/dashboard/${$page.params.conferenceId}/paperhub/${paperData.id}/print`}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-sm btn-ghost"
					>
						<i class="fa-solid fa-file-pdf"></i>
						{m.paperExportPdf()}
					</a>
				</div>
			</div>
		</div>

		<!-- Supervisor Read-Only Banner -->
		{#if baseViewMode === 'supervisor'}
			<div class="alert alert-info">
				<i class="fa-solid fa-chalkboard-user"></i>
				<span>{m.readOnlyViewSupervisor()}</span>
			</div>
		{/if}

		<!-- Action Bar (hidden for supervisors) -->
		{#if baseViewMode !== 'supervisor'}
			<div class="card bg-base-100 border border-base-300">
				<div class="card-body p-3 flex-row items-center justify-between flex-wrap gap-2">
					<!-- Author/Edit Actions (Left) -->
					<div class="flex gap-2">
						{#if baseViewMode === 'author' || reviewerEditMode}
							{#if paperData.status === 'DRAFT'}
								<button
									class="btn btn-warning btn-sm"
									onclick={() => saveFile()}
									disabled={!unsavedChanges}
								>
									<i class="fa-solid fa-save"></i>
									{m.paperSaveDraft()}
								</button>
							{/if}
							<button
								class="btn btn-primary btn-sm"
								onclick={() => saveFile({ submit: true })}
								disabled={!unsavedChanges && paperData.status !== 'DRAFT'}
							>
								<i class="fa-solid fa-paper-plane"></i>
								{paperData.status === 'DRAFT' ? m.paperSubmit() : m.paperResubmit()}
							</button>
						{/if}
					</div>

					<!-- Reviewer Toggle (Right) -->
					{#if isReviewer && baseViewMode === 'reviewer'}
						<div class="flex gap-2">
							<button
								class="btn btn-sm {reviewerEditMode ? 'btn-warning' : 'btn-ghost'}"
								onclick={() => (reviewerEditMode = !reviewerEditMode)}
							>
								<i class="fa-solid {reviewerEditMode ? 'fa-eye' : 'fa-pen-to-square'}"></i>
								{reviewerEditMode ? m.viewer() : m.edit()}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
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
					{#if paperData.type === 'WORKING_PAPER' && resolutionValidationError}
						<!-- Invalid format error for working papers -->
						<div class="alert alert-error flex-col items-start gap-3">
							<div class="flex items-center gap-3">
								<i class="fa-solid fa-triangle-exclamation text-2xl"></i>
								<div>
									<p class="font-semibold">{m.paperInvalidFormat()}</p>
									<p class="text-sm opacity-80">{m.paperInvalidFormatDescription()}</p>
									{#if invalidRawContent}
										<button class="btn btn-sm btn-outline mt-2" onclick={downloadRawContent}>
											<i class="fa-solid fa-download"></i>
											{m.paperInvalidFormatDownload()}
										</button>
									{/if}
								</div>
							</div>
						</div>
					{:else if paperData.type === 'WORKING_PAPER'}
						<PaperEditor.Resolution.ResolutionEditor
							committeeName={paperData.agendaItem?.committee?.name ?? 'Committee'}
							editable={editorEditable}
							headerData={resolutionHeaderData}
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
					{snippets}
				/>
			{/if}

			<!-- History for authors and supervisors (versions + reviews) -->
			{#if (baseViewMode === 'author' || baseViewMode === 'supervisor') && (paperData.versions.length > 0 || existingReviews.length > 0)}
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
						{#each authorTimelineEvents as event, index (event.type === 'review' ? event.review.id : event.version.id)}
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
