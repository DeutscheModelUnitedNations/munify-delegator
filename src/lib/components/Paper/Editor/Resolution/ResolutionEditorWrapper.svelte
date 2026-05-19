<script lang="ts">
	/**
	 * Resolution Editor Wrapper
	 *
	 * Bridges the external resolution-editor library with DELEGATOR.
	 * This component:
	 * - Uses the library's ResolutionEditor component
	 * - Consumes the shared `resolutionStore` (native store, snapshot is the
	 *   single source of truth)
	 * - Provides German phrase patterns
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
	import { resolutionStore } from '../editorStore';
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

	// Seed the committee name when the store holds no name yet (e.g. a freshly
	// created working paper). A loaded resolution carries its own committee
	// name, so we never clobber it.
	$effect(() => {
		if (!resolutionStore.snapshot.committeeName && committeeName) {
			resolutionStore.setCommitteeName(committeeName);
		}
	});

	// Get i18n labels
	const labels = getResolutionLabels();

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
	store={resolutionStore}
	{editable}
	{headerData}
	{labels}
	preamblePhrases={germanPreamblePhrases}
	operativePhrases={germanOperativePhrases}
	onCopySuccess={handleCopySuccess}
	onCopyError={handleCopyError}
	{clauseToolbar}
	{clauseAnnotations}
	{previewHeader}
	{previewFooter}
/>
