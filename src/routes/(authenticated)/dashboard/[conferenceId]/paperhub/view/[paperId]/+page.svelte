<script lang="ts">
	import type { PageData } from './$houdini';
	import {
		validateResolution,
		type ResolutionHeaderData
	} from '$lib/components/Paper/Editor/Resolution';
	import PaperEditor from '$lib/components/Paper/Editor';
	import {
		editorContentStore,
		resolutionContentStore
	} from '$lib/components/Paper/Editor/editorStore';
	import { translatePaperType } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getPaperTypeIcon } from '$lib/services/enumIcons';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.getPublicPaperContentQuery);
	let paperData = $derived($paperQuery?.data?.findPublicPaperContent);

	let initialized = $state(false);
	let currentPaperId = $state<string | null>(null);
	let resolutionValidationError = $state<string | null>(null);
	let invalidRawContent = $state<unknown>(null);

	// Reset and reinitialize when paper changes
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
	<!-- Back Button -->
	<div>
		<a
			href={`/dashboard/${$page.params.conferenceId}/paperhub?viewToggle=global`}
			class="btn btn-ghost btn-sm"
		>
			<i class="fa-solid fa-arrow-left"></i>
			{m.backToConferencePapers()}
		</a>
	</div>

	{#if paperData}
		<!-- Paper Header Card -->
		<div class="card bg-base-200 border border-base-300">
			<div class="card-body p-4">
				<!-- Top Row: Country/NSA -->
				<div class="flex items-center gap-3">
					<Flag size="md" alpha2Code={nation?.alpha2Code} {nsa} icon={nsa?.fontAwesomeIcon} />
					<span class="text-lg font-semibold">
						{nation ? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code) : nsa?.name}
					</span>
				</div>

				<!-- Title -->
				<h1 class="text-2xl font-bold mt-2">{title}</h1>

				<!-- Metadata Row -->
				<div class="flex items-center gap-3 mt-2 flex-wrap text-sm text-base-content/70">
					<span class="flex items-center gap-1">
						<i class="fa-solid {getPaperTypeIcon(paperData.type)}"></i>
						{translatePaperType(paperData.type)}
					</span>
					{#if paperData.firstSubmittedAt}
						<span class="text-base-content/30">•</span>
						<div class="tooltip" data-tip={m.submittedAt()}>
							<span class="flex items-center gap-1">
								<i class="fa-solid fa-paper-plane text-xs"></i>
								{new Date(paperData.firstSubmittedAt).toLocaleDateString()}
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Read-Only Info Banner -->
		<div class="alert alert-info">
			<i class="fa-solid fa-eye"></i>
			<span>{m.readOnlyViewParticipant()}</span>
		</div>
	{:else}
		<div>
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		</div>
	{/if}

	{#if initialized && paperData}
		<div class="w-full flex flex-col gap-4">
			<!-- Paper Content -->
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
					editable={false}
					headerData={resolutionHeaderData}
				/>
			{:else}
				<PaperEditor.PaperFormat editable={false} />
			{/if}
		</div>
	{:else if !paperData}
		<div class="mt-6 w-full h-12 skeleton"></div>
	{/if}
</div>
