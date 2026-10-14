<script lang="ts">
	import PaperEditor from '$lib/components/paper/editor';
	import type { ResolutionHeaderData } from '$lib/components/paper/editor/resolution';
	import InvalidPaperFormatAlert from './InvalidPaperFormatAlert.svelte';
	import type { LoadedPaper } from './loadedPaper.svelte';
	import type { PaperIdentity } from './paperDisplay';

	/**
	 * The editor for a paper already loaded into the shared editor stores: the resolution editor
	 * for working papers (or, when their content did not parse, an alert offering it as a
	 * download), the plain paper editor otherwise.
	 */
	interface Props {
		paper: Pick<PaperIdentity, 'id' | 'type' | 'agendaItem'>;
		loaded: LoadedPaper;
		editable: boolean;
		headerData: ResolutionHeaderData | undefined;
		onQuoteSelection?: (text: string) => void;
	}

	let { paper, loaded, editable, headerData, onQuoteSelection }: Props = $props();
</script>

{#if paper.type !== 'WORKING_PAPER'}
	<PaperEditor.PaperFormat {editable} {onQuoteSelection} />
{:else if loaded.validationError}
	<InvalidPaperFormatAlert paperId={paper.id} rawContent={loaded.invalidRawContent} />
{:else}
	<PaperEditor.Resolution.ResolutionEditor
		committeeName={paper.agendaItem?.committee.name ?? 'Committee'}
		{editable}
		{headerData}
	/>
{/if}
