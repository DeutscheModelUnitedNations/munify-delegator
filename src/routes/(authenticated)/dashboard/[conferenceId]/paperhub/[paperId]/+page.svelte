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
	import { cache, graphql } from '$houdini';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
	import PaperReviewSection from './PaperReviewSection.svelte';
	import CommonEditor from '$lib/components/Paper/Editor/CommonEditor.svelte';

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
	let isReviewer = $derived(
		(data.TeamMemberStatusQuery?.data?.findManyTeamMembers?.length ?? 0) > 0
	);
	let viewMode = $derived<'author' | 'reviewer'>(
		isAuthor ? 'author' : isReviewer ? 'reviewer' : 'author'
	);

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
	let existingReviews = $derived(latestVersion?.reviews ?? []);

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

		const resposne = await toast.promise(
			updatePaperMutation.mutate({
				paperId: paperData.id,
				content: $editorContentStore,
				status: submit ? 'SUBMITTED' : 'DRAFT'
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
		{#if viewMode === 'author'}
			<div class="join join-vertical md:join-horizontal w-full">
				{#if paperData.status === 'DRAFT'}
					<button
						class="btn btn-warning btn-lg join-item"
						onclick={() => saveFile()}
						disabled={!unsavedChanges}
					>
						<i class="fa-solid fa-pencil mr-2"></i>
						{m.paperSaveDraft()}
					</button>
				{/if}
				<button
					class="btn btn-primary btn-lg join-item"
					onclick={() => saveFile({ submit: true })}
					disabled={!unsavedChanges && paperData.status !== 'DRAFT'}
				>
					<i class="fa-solid fa-paper-plane mr-2"></i>
					{paperData.status === 'DRAFT' ? m.paperSubmit() : m.paperResubmit()}
				</button>
			</div>
		{/if}
	{:else}
		<div>
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}
	{#if initialized}
		<div class="w-full flex flex-col xl:flex-row-reverse gap-4">
			<div class="flex flex-col gap-4 xl:w-1/3"></div>
			{#if viewMode === 'author'}
				<!-- Author view: editable editor -->
				{#if paperData.type === 'WORKING_PAPER'}
					<PaperEditor.ResolutionFormat editable />
				{:else}
					<PaperEditor.PaperFormat editable />
				{/if}

				<!-- Review history for authors -->
				{#if existingReviews.length > 0}
					<div class="card bg-base-200 p-4 mt-4">
						<h3 class="text-lg font-bold mb-4">{m.reviewHistory()}</h3>
						<div class="flex flex-col gap-3">
							{#each existingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as review}
								<div class="card bg-base-100 p-3">
									<div class="flex justify-between items-start mb-2">
										<div>
											<p class="font-semibold">
												{review.reviewer.given_name}
												{review.reviewer.family_name}
											</p>
											<p class="text-sm opacity-70">
												{new Date(review.createdAt).toLocaleString()}
											</p>
										</div>
										{#if review.statusBefore && review.statusAfter}
											<div class="badge badge-sm">
												{review.statusBefore} → {review.statusAfter}
											</div>
										{/if}
									</div>
									<div class="prose prose-sm max-w-none">
										<CommonEditor
											contentStore={{ subscribe: (fn) => fn(review.comments) }}
											editable={false}
											placeholder=""
											legend=""
										/>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{:else}
				<!-- Reviewer view: read-only editor + review section -->
				{#if paperData.type === 'WORKING_PAPER'}
					<PaperEditor.ResolutionFormat editable={false} />
				{:else}
					<PaperEditor.PaperFormat editable={false} />
				{/if}

				<!-- Review interface for reviewers -->
				<PaperReviewSection
					paperId={paperData.id}
					currentStatus={paperData.status}
					{existingReviews}
				/>
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
