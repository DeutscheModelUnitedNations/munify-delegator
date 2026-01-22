<script lang="ts">
	/**
	 * Resolution Editor Wrapper
	 *
	 * Bridges the external resolution-editor library with DELEGATOR's store-based architecture.
	 * This component:
	 * - Uses the library's ResolutionEditor component
	 * - Syncs changes to resolutionContentStore
	 * - Fetches phrase patterns from /resolution-phrases/
	 * - Integrates Paraglide i18n via the adapter
	 */
	import { ResolutionEditor } from '@deutschemodelunitednations/munify-resolution-editor';
	import {
		germanPreamblePhrases,
		germanOperativePhrases
	} from '@deutschemodelunitednations/munify-resolution-editor/phrases/de';
	import type {
		Resolution,
		ResolutionHeaderData
	} from '@deutschemodelunitednations/munify-resolution-editor/schema';
	import { resolutionContentStore } from '../editorStore';
	import { getResolutionLabels } from '$lib/resolution-editor-i18n';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { OperativeClause } from '@deutschemodelunitednations/munify-resolution-editor/schema';

	interface Props {
		committeeName: string;
		editable?: boolean;
		headerData?: ResolutionHeaderData;
		// Extension points (Svelte 5 snippets)
		clauseToolbar?: Snippet<[{ clause: OperativeClause; index: number }]>;
		clauseAnnotations?: Snippet<[{ clause: OperativeClause; index: number }]>;
		previewHeader?: Snippet<[{ resolution: Resolution; headerData?: ResolutionHeaderData }]>;
		previewFooter?: Snippet<[{ resolution: Resolution }]>;
	}

	let {
		committeeName,
		editable = true,
		headerData,
		clauseToolbar,
		clauseAnnotations,
		previewHeader,
		previewFooter
	}: Props = $props();

	// Get current resolution from store, or create empty one
	let resolution = $derived($resolutionContentStore ?? { committeeName, preamble: [], operative: [] });

	// Get i18n labels
	const labels = getResolutionLabels();

	// Handle resolution changes - sync to store
	function handleResolutionChange(updated: Resolution) {
		$resolutionContentStore = updated;
	}

	// Handle copy success with toast notification
	function handleCopySuccess(phrase: string) {
		toast.success(m.phraseCopied());
	}

	// Handle copy error with toast notification
	function handleCopyError(error: Error) {
		toast.error(m.copyFailed());
	}
</script>

<ResolutionEditor
	{committeeName}
	{resolution}
	{editable}
	{headerData}
	{labels}
	preamblePhrases={germanPreamblePhrases}
	operativePhrases={germanOperativePhrases}
	onResolutionChange={handleResolutionChange}
	onCopySuccess={handleCopySuccess}
	onCopyError={handleCopyError}
	{clauseToolbar}
	{clauseAnnotations}
	{previewHeader}
	{previewFooter}
/>
