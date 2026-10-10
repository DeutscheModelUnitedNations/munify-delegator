<script lang="ts">
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchMyPaperHubRoles } from '../myPaperHubRoles';
	import { editorContentStore, resolutionStore } from '$lib/components/paper/editor/editorStore';
	import { compareEditorContentHash } from '$lib/components/paper/editor/contentHash';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import {
		buildResolutionHeaderData,
		currentEditorContent,
		paperEntityName,
		paperTitle
	} from '../paperDisplay';
	import PaperHeaderCard from '../PaperHeaderCard.svelte';
	import PaperContent from '../PaperContent.svelte';
	import { LoadedPaper } from '../loadedPaper.svelte';
	import { paperSaveToastMessages } from '../paperSaving';
	import PaperActionBar from './PaperActionBar.svelte';
	import { fetchPaperDetail, type PaperDetail } from './paperDetail';
	import PaperExportButtons from './PaperExportButtons.svelte';
	import PaperReviewSection from './PaperReviewSection.svelte';
	import PaperHistory from './PaperHistory.svelte';
	import PaperDangerZone from './PaperDangerZone.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const [currentUser, paperData, myRoles] = $derived(
		await Promise.all([
			getCurrentUser(),
			fetchPaperDetail(params.paperId),
			fetchMyPaperHubRoles(params.conferenceId)
		])
	);

	// View mode detection
	let isAuthor = $derived(paperData?.author.id === currentUser.sub);
	let isReviewer = $derived(myRoles.isReviewer);
	let isSupervisor = $derived(
		myRoles.supervisedDelegationIds.includes(paperData?.delegation.id ?? '')
	);
	let baseViewMode = $derived<'author' | 'reviewer' | 'supervisor'>(
		isAuthor ? 'author' : isReviewer ? 'reviewer' : isSupervisor ? 'supervisor' : 'author'
	);

	// Edit mode toggle for reviewers
	let reviewerEditMode = $state(false);
	let editorEditable = $derived(baseViewMode === 'author' || reviewerEditMode);

	const loaded = new LoadedPaper();

	// Only the latest version is fetched, ordered newest first.
	let latestVersion = $derived(paperData?.versions.at(0));
	let versionNumber = $derived(latestVersion?.version ?? 0);

	// Watch the route param directly - it is guaranteed to change on navigation, while the loaded
	// paper arrives a tick later.
	$effect(() => {
		const routePaperId = params.paperId;
		if (routePaperId && routePaperId !== loaded.paperId) {
			// Route changed - reset initialized to show loading state
			// and wait for paperData to arrive
			loaded.initialized = false;
		}
	});

	// Initialize stores when paper data arrives
	$effect(() => {
		const routePaperId = params.paperId;
		if (paperData && paperData.id === routePaperId) {
			loaded.loadIfNew(paperData, latestVersion?.content);
		}
	});

	let resolutionHeaderData = $derived(
		paperData ? buildResolutionHeaderData(paperData, paperData.conference) : undefined
	);

	// Get the current content from the correct store based on paper type
	let currentContent = $derived(
		paperData?.type === 'WORKING_PAPER' ? resolutionStore.snapshot : $editorContentStore
	);

	let hasCurrentContent = $derived(currentContent !== undefined && currentContent !== null);
	let latestContentHash = $derived(latestVersion?.contentHash);

	let unsavedChanges = $state(false);

	$effect(() => {
		if (paperData && hasCurrentContent && !loaded.validationError) {
			compareEditorContentHash(JSON.stringify(currentContent), latestContentHash).then(
				(areEqual) => {
					unsavedChanges = !areEqual;
				}
			);
		}
	});

	const saveFile = async (submit: boolean) => {
		if (!paperData) return;

		// Determine status: reviewers keep current status, authors change to SUBMITTED/DRAFT
		const newStatus = reviewerEditMode ? paperData.status : submit ? 'SUBMITTED' : 'DRAFT';

		const promise = client.mutate.updatePaper({
			__args: {
				paperId: paperData.id,
				content: currentEditorContent(paperData.type),
				status: newStatus
			},
			id: true
		});
		toast.promise(promise, paperSaveToastMessages(submit));
		await promise;
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

	let deleteConfirmationExpected = $derived(
		paperData ? `${paperTitle(paperData)} - ${paperEntityName(paperData.delegation) ?? ''}` : ''
	);
</script>

{#snippet paperHeader(paper: PaperDetail)}
	<PaperHeaderCard {paper} status={paper.status} {versionNumber} createdAt={paper.createdAt}>
		{#snippet actions()}
			<PaperExportButtons {paper} {resolutionHeaderData} />
		{/snippet}
	</PaperHeaderCard>

	{#if baseViewMode === 'supervisor'}
		<!-- Supervisor Read-Only Banner -->
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-chalkboard-user"></i>
			<span>{m.readOnlyViewSupervisor()}</span>
		</div>
	{:else}
		<!-- Action Bar (hidden for supervisors) -->
		<PaperActionBar
			status={paper.status}
			viewMode={baseViewMode}
			{isReviewer}
			bind:reviewerEditMode
			{unsavedChanges}
			onSave={saveFile}
		/>
	{/if}
{/snippet}

{#snippet paperBody(paper: PaperDetail)}
	<div class="w-full flex flex-col gap-4">
		<!-- Paper Editor - key forces re-creation when paper or editable changes -->
		<div bind:this={paperEditorContainer}>
			{#key `${paper.id}-${editorEditable}`}
				<PaperContent
					{paper}
					{loaded}
					editable={editorEditable}
					headerData={resolutionHeaderData}
					onQuoteSelection={baseViewMode === 'reviewer' ? handleQuoteSelection : undefined}
				/>
			{/key}
		</div>

		{#if baseViewMode === 'reviewer'}
			<!-- Review form, followed by the history -->
			{#key paper.id}
				<PaperReviewSection
					paperId={paper.id}
					conferenceId={params.conferenceId}
					currentStatus={paper.status}
					quoteToInsert={quoteToInsert ?? undefined}
					onQuoteInserted={clearQuote}
					paperContainer={paperEditorContainer}
					agendaItemId={paper.agendaItem?.id}
				/>
			{/key}
		{:else}
			<!-- History for authors and supervisors (versions + reviews) -->
			<PaperHistory paperId={paper.id} paperContainer={paperEditorContainer} />
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-4 w-full">
	{#if paperData}
		{@render paperHeader(paperData)}
	{:else}
		<div>
			<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}
	{#if loaded.initialized && paperData}
		{@render paperBody(paperData)}
	{:else}
		<div class="mt-6 w-full h-12 skeleton"></div>
	{/if}

	<!-- Hidden Danger Zone: project management, or the author while it is still a draft -->
	{#if paperData && (myRoles.mayDeleteAnyPaper || (isAuthor && paperData.status === 'DRAFT'))}
		<PaperDangerZone
			paperId={paperData.id}
			conferenceId={params.conferenceId}
			confirmationText={deleteConfirmationExpected}
		/>
	{/if}
</div>

{#if unsavedChanges}
	<div class="fixed top-4 right-4 z-50">
		<div
			class="bg-warning p-4 rounded-box shadow-lg tooltip tooltip-left tooltip-warning"
			data-tip={m.paperNotSavedAlert()}
		>
			<i class="fa-sharp-duotone fa-solid fa-exclamation-triangle fa-beat-fade text-4xl"></i>
		</div>
	</div>
{/if}
