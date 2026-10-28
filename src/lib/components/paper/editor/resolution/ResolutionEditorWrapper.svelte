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
	import { getResolutionLabels } from '#lib/resolution-editor-i18n.js';
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages.js';
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
	function handleCopySuccess() {
		toast.success(m.phraseCopied());
	}

	// Handle copy error with toast notification
	function handleCopyError() {
		toast.error(m.copyFailed());
	}
</script>

<div class="resolution-editor-host w-full min-w-0">
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
</div>

<style>
	/* The library's root is a grid <fieldset>; both it and its items otherwise grow to their min-content width. */
	.resolution-editor-host :global(fieldset),
	.resolution-editor-host :global(fieldset > *) {
		min-inline-size: 0;
	}

	@media (max-width: 639px) {
		/* Section headers put a title and up to three buttons in one row: let them wrap. */
		.resolution-editor-host :global(.flex.items-center.justify-between),
		.resolution-editor-host :global(.flex.items-center.justify-between > .flex) {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		/* The preview mimics a printed page; on a phone it keeps the page look without its margins. */
		.resolution-editor-host :global(.resolution-preview) {
			padding-inline: 0.5rem;
			overflow-wrap: anywhere;
		}

		.resolution-editor-host :global(.resolution-preview .text-3xl) {
			font-size: 1.5rem;
		}
	}
</style>
