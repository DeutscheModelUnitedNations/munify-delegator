<script lang="ts">
	import type { PageData } from './$houdini';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import {
		ResolutionPreview,
		type ResolutionHeaderData
	} from '$lib/components/Paper/Editor/Resolution';
	import PaperPrintPreview from '$lib/components/Paper/Print/PaperPrintPreview.svelte';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.getPaperForPrintQuery);
	let paperData = $derived($paperQuery?.data?.findUniquePaper);

	// Get latest version content
	let latestVersion = $derived.by(() => {
		if (!paperData?.versions?.length) return null;
		return paperData.versions.reduce((acc, version) =>
			version.version > acc.version ? version : acc
		);
	});

	let content = $derived(latestVersion?.content);

	// Extract entity info
	let nation = $derived(paperData?.delegation?.assignedNation);
	let nsa = $derived(paperData?.delegation?.assignedNonStateActor);

	// For Working Papers: create resolution header data
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
			conferenceEmblem: paperData.conference?.emblemDataURL ?? undefined,
			committeeAbbreviation: paperData.agendaItem?.committee?.abbreviation,
			committeeFullName: paperData.agendaItem?.committee?.name,
			committeeResolutionHeadline: paperData.agendaItem?.committee?.resolutionHeadline ?? undefined,
			documentNumber: `WP/${year}/${paperData.id.slice(-6)}`,
			topic: paperData.agendaItem?.title,
			authoringDelegation: nationName ?? nsaName
		};
	});

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>{m.paperPrintTitle()}</title>
	<style>
		@media print {
			body {
				margin: 0;
				padding: 0;
			}
			@page {
				size: A4;
				margin: 2cm;
			}
		}
	</style>
</svelte:head>

<div class="print-page">
	<!-- Print Controls (hidden during print) -->
	<div class="print-controls no-print">
		<button class="btn btn-primary" onclick={handlePrint}>
			<i class="fa-solid fa-print"></i>
			{m.paperPrintButton()}
		</button>
		<p class="print-hint">{m.paperPrintHint()}</p>
	</div>

	<!-- Paper Preview -->
	<div class="print-content">
		{#if paperData && content}
			{#if paperData.type === 'WORKING_PAPER'}
				<!-- Working Paper: Use Resolution Preview with UN-style header -->
				<ResolutionPreview resolution={content} headerData={resolutionHeaderData} />
			{:else}
				<!-- Position/Introduction Paper: Use Paper Print Preview -->
				<PaperPrintPreview
					conferenceName={paperData.conference?.title ?? 'Model UN'}
					paperType={paperData.type}
					nationAlpha2Code={nation?.alpha2Code}
					nationAlpha3Code={nation?.alpha3Code}
					nsaName={nsa?.name}
					nsaIcon={nsa?.fontAwesomeIcon}
					committeeName={paperData.agendaItem?.committee?.name}
					committeeAbbreviation={paperData.agendaItem?.committee?.abbreviation}
					topic={paperData.agendaItem?.title}
					{content}
				/>
			{/if}
		{:else}
			<div class="loading">
				<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
			</div>
		{/if}
	</div>
</div>

<style>
	.print-page {
		min-height: 100vh;
		background: #f3f4f6;
	}

	.print-controls {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: white;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		border-bottom: 1px solid #e5e7eb;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.print-hint {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.print-content {
		padding: 5rem 1rem 2rem 1rem;
		display: flex;
		justify-content: center;
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 50vh;
	}

	/* Hide controls during print */
	@media print {
		.no-print {
			display: none !important;
		}

		.print-page {
			background: white;
		}

		.print-content {
			padding: 0;
		}
	}
</style>
