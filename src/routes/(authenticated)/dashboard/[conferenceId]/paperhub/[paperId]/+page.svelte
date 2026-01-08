<script lang="ts">
	import type { PageData } from './$houdini';
	import PaperEditor from '$lib/components/Paper/Editor';
	import { editorContentStore } from '$lib/components/Paper/Editor/editorStore';
	import { onMount } from 'svelte';
	import { compareEditorContentHash } from '$lib/components/Paper/Editor/contentHash';
	import { translatePaperStatus, translatePaperType } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import InfoChip from './InfoChip.svelte';
	import { getPaperStatusIcon, getPaperTypeIcon } from '$lib/services/enumIcons';
	import type { PaperStatus$options } from '$houdini';

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
	import { cache, graphql } from '$houdini';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
	import PaperReviewSection from './PaperReviewSection.svelte';

	const updatePaperMutation = graphql(`
		mutation UpdatePaperMutation($paperId: String!, $content: Json!, $status: PaperStatus) {
			updateOnePaper(where: { paperId: $paperId }, data: { content: $content, status: $status }) {
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

	onMount(() => {
		$editorContentStore = latestVersion.content;
		initialized = true;
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
			{#key editorEditable}
				{#if paperData.type === 'WORKING_PAPER'}
					<PaperEditor.ResolutionFormat editable={editorEditable} />
				{:else}
					<PaperEditor.PaperFormat editable={editorEditable} />
				{/if}
			{/key}

			<!-- Review section for reviewers -->
			{#if baseViewMode === 'reviewer'}
				<PaperReviewSection
					paperId={paperData.id}
					currentStatus={paperData.status}
					{existingReviews}
					versions={paperData.versions}
				/>
			{/if}

			<!-- Review history for authors -->
			{#if baseViewMode === 'author' && existingReviews.length > 0}
				<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
					<legend class="fieldset-legend">{m.reviewHistory()}</legend>
					<ul class="timeline timeline-vertical timeline-compact">
						{#each existingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as review, index}
							<li>
								{#if index > 0}
									<hr class="bg-base-300" />
								{/if}
								<div class="timeline-start text-xs text-base-content/60 text-right pr-2">
									<div>{new Date(review.createdAt).toLocaleDateString()}</div>
									<div>
										{new Date(review.createdAt).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</div>
								</div>
								<div class="timeline-middle">
									<i class="fa-solid fa-circle-dot text-primary"></i>
								</div>
								<div class="timeline-end timeline-box bg-base-100 w-full">
									<div class="flex flex-wrap justify-between items-start gap-2 mb-2">
										<div class="flex items-center gap-2">
											<i class="fa-solid fa-user-pen text-base-content/50"></i>
											<span class="font-semibold">
												{review.reviewer.given_name}
												{review.reviewer.family_name}
											</span>
										</div>
										{#if review.statusBefore && review.statusAfter}
											<div class="flex items-center gap-1">
												<div
													class="badge {getStatusBadgeClass(review.statusBefore)} badge-sm gap-1"
												>
													<i class="fa-solid {getPaperStatusIcon(review.statusBefore)} text-xs"></i>
													{translatePaperStatus(review.statusBefore)}
												</div>
												<i class="fa-solid fa-arrow-right text-xs text-base-content/50"></i>
												<div class="badge {getStatusBadgeClass(review.statusAfter)} badge-sm gap-1">
													<i class="fa-solid {getPaperStatusIcon(review.statusAfter)} text-xs"></i>
													{translatePaperStatus(review.statusAfter)}
												</div>
											</div>
										{/if}
									</div>
									<fieldset
										class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-2"
									>
										<legend class="fieldset-legend text-xs">{m.reviewComments()}</legend>
										<PaperEditor.ReadOnlyContent content={review.comments} />
									</fieldset>
								</div>
								{#if index < existingReviews.length - 1}
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
