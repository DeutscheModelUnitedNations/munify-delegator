<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { editorContentStore, resolutionStore } from '#lib/components/paper/editor/editorStore';
	import type { ResolutionHeaderData } from '#lib/components/paper/editor/resolution/index';
	import {
		downloadResolutionPdf,
		downloadResolutionTypst,
		downloadPaperPdf,
		downloadPaperTypst
	} from './resolutionExport';
	import { paperExportJob } from './paperExport';
	import type { PaperDetail } from './paperDetail';

	interface Props {
		paper: PaperDetail;
		/** Built once by the page, which hands the same header to the resolution editor. */
		resolutionHeaderData: ResolutionHeaderData | undefined;
	}

	let { paper, resolutionHeaderData }: Props = $props();

	// The live editor state, so unsaved edits are included, falling back to the latest saved
	// version while the editor has no content yet.
	let exportContent = $derived(
		(paper.type === 'WORKING_PAPER' ? resolutionStore.snapshot : $editorContentStore) ||
			paper.versions.at(0)?.content
	);

	// What to export: a resolution for working papers, a text document otherwise
	let job = $derived(paperExportJob({ paper, resolutionHeaderData }));

	let isExportingPdf = $state(false);

	function exportTypst() {
		if (!exportContent) return;
		if (job.kind === 'resolution') {
			downloadResolutionTypst({
				resolution: exportContent,
				header: job.header,
				documentNumber: job.docNumber
			});
		} else {
			downloadPaperTypst({ content: exportContent, meta: job.meta, documentNumber: job.docNumber });
		}
	}

	/** Downloads the PDF matching the paper's type. */
	function downloadPdf(content: NonNullable<typeof exportContent>) {
		return job.kind === 'resolution'
			? downloadResolutionPdf({
					resolution: content,
					header: job.header,
					documentNumber: job.docNumber
				})
			: downloadPaperPdf({ content, meta: job.meta, documentNumber: job.docNumber });
	}

	async function exportPdf() {
		if (!exportContent || isExportingPdf) return;
		isExportingPdf = true;
		try {
			await toast.promise(downloadPdf(exportContent), {
				loading: m.paperExportPdfLoading(),
				success: m.paperExportPdfSuccess(),
				error: m.paperExportPdfError()
			});
		} finally {
			isExportingPdf = false;
		}
	}
</script>

<button
	class="btn btn-sm btn-primary"
	disabled={!exportContent || isExportingPdf}
	onclick={exportPdf}
>
	{#if isExportingPdf}
		<span class="loading loading-spinner loading-xs"></span>
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-file-pdf"></i>
	{/if}
	{m.paperExportPdf()}
</button>
<button class="btn btn-sm btn-ghost" disabled={!exportContent} onclick={exportTypst}>
	<i class="fa-sharp-duotone fa-solid fa-file-code"></i>
	{m.paperExportTypst()}
</button>
