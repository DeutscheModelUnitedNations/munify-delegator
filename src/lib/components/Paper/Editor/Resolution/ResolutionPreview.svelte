<script lang="ts">
	import type {
		Resolution,
		SubClause,
		ClauseBlock,
		OperativeClause,
		ResolutionHeaderData
	} from '$lib/schemata/resolution';
	import {
		getSubClauseLabel,
		isClauseEmpty,
		getFirstTextContent,
		migrateResolution
	} from '$lib/schemata/resolution';
	import {
		type PhrasePattern,
		loadPhrasePatterns,
		validatePhrase
	} from '$lib/services/phraseValidation';
	import { m } from '$lib/paraglide/messages';
	import unEmblem from '$assets/un-emblem.svg';

	interface Props {
		resolution: Resolution;
		headerData?: ResolutionHeaderData;
	}

	let { resolution: rawResolution, headerData }: Props = $props();

	// Migrate legacy format if needed
	let resolution = $derived(migrateResolution(rawResolution) as Resolution);

	// Filter out empty clauses for preview
	let nonEmptyPreamble = $derived(resolution.preamble.filter((c) => c.content.trim()));
	let nonEmptyOperative = $derived(resolution.operative.filter((c) => !isClauseEmpty(c)));

	// Load phrase patterns for italicization
	let preamblePatterns = $state<PhrasePattern[]>([]);
	let operativePatterns = $state<PhrasePattern[]>([]);

	$effect(() => {
		loadPhrasePatterns('preamble').then((patterns) => {
			preamblePatterns = patterns;
		});
		loadPhrasePatterns('operative').then((patterns) => {
			operativePatterns = patterns;
		});
	});

	// Format clause content using phrase validation for italicization
	function formatClauseContent(
		content: string,
		patterns: PhrasePattern[]
	): { firstPhrase: string; rest: string } {
		const trimmed = content.trim();
		if (!trimmed) return { firstPhrase: '', rest: '' };

		// Try to match against phrase patterns
		const result = validatePhrase(trimmed, patterns);
		if (result.valid && result.matchedPhrase) {
			return {
				firstPhrase: result.matchedPhrase,
				rest: trimmed.slice(result.italicEnd ?? result.matchedPhrase.length)
			};
		}

		// Fall back to first word if no pattern matched
		const firstSpaceIndex = trimmed.indexOf(' ');
		if (firstSpaceIndex === -1) {
			return { firstPhrase: trimmed, rest: '' };
		}
		return {
			firstPhrase: trimmed.slice(0, firstSpaceIndex),
			rest: trimmed.slice(firstSpaceIndex)
		};
	}

	// Get disclaimer text with conference name
	let disclaimerText = $derived(
		m.resolutionDisclaimer({ conferenceName: headerData?.conferenceName ?? 'Model UN' })
	);

	// Check if this is the last non-empty content in the operative section
	function isLastContent(
		operativeIndex: number,
		blocks: ClauseBlock[],
		blockIndex: number,
		subClauseIndex?: number,
		subClauseBlocks?: ClauseBlock[],
		subBlockIndex?: number
	): boolean {
		const isLastOperative = operativeIndex === nonEmptyOperative.length - 1;
		if (!isLastOperative) return false;

		const isLastBlock = blockIndex === blocks.length - 1;
		if (subClauseIndex === undefined) {
			return isLastBlock;
		}

		// We're inside a subclauses block
		const subclausesBlock = blocks[blockIndex];
		if (subclausesBlock.type !== 'subclauses') return false;

		const isLastSubClause = subClauseIndex === subclausesBlock.items.length - 1;
		if (!isLastSubClause || !isLastBlock) return false;

		if (subBlockIndex === undefined || subClauseBlocks === undefined) {
			return true;
		}

		return subBlockIndex === subClauseBlocks.length - 1;
	}
</script>

<div class="resolution-preview">
	{#if headerData}
		<!-- Watermark Disclaimer -->
		<div class="watermark-disclaimer">
			{disclaimerText}
		</div>

		<!-- UN Header Row: "United Nations" left, Document Number right -->
		<div class="un-header-row">
			<div class="un-title">{m.resolutionUnitedNations()}</div>
			{#if headerData.documentNumber}
				<div class="document-number">
					<span class="doc-abbrev">{headerData.committeeAbbreviation}</span><span class="doc-rest"
						>/{headerData.documentNumber}</span
					>
				</div>
			{/if}
		</div>

		<!-- Thin Divider -->
		<hr class="thin-divider" />

		<!-- Committee Section with Emblem -->
		<div class="committee-section">
			<img src={unEmblem} alt="UN Emblem" class="un-emblem" />
			<div class="committee-name">
				{headerData.committeeFullName ?? resolution.committeeName}
			</div>
		</div>

		<!-- Topic -->
		{#if headerData.topic}
			<div class="metadata-section">
				<div class="metadata-label">{m.resolutionTopic()}</div>
				<div class="metadata-value">{headerData.topic}</div>
			</div>
		{/if}

		<!-- Authoring Delegation -->
		{#if headerData.authoringDelegation}
			<div class="metadata-section">
				<div class="metadata-label">{m.resolutionAuthoringDelegation()}</div>
				<div class="metadata-value">{headerData.authoringDelegation}</div>
			</div>
		{/if}

		<!-- Small Print Disclaimer -->
		<div class="small-disclaimer">
			{disclaimerText}
		</div>

		<!-- Thick Divider -->
		<hr class="thick-divider" />
	{/if}

	<!-- Resolution Content Header -->
	<div class="resolution-header">
		{#if headerData?.committeeFullName}
			{headerData.committeeFullName},
		{:else}
			{resolution.committeeName.toUpperCase()},
		{/if}
	</div>

	<!-- Preamble Section -->
	{#if nonEmptyPreamble.length > 0}
		<div class="preamble-section">
			{#each nonEmptyPreamble as clause}
				{@const formatted = formatClauseContent(clause.content, preamblePatterns)}
				<p class="preamble-clause">
					<span class="italic">{formatted.firstPhrase}</span>{formatted.rest},
				</p>
			{/each}
		</div>
	{/if}

	<!-- Operative Section -->
	{#if nonEmptyOperative.length > 0}
		<ol class="operative-section">
			{#each nonEmptyOperative as clause, opIndex}
				{@const isLastOperative = opIndex === nonEmptyOperative.length - 1}
				<li class="operative-clause">
					{@render operativeClauseBlocks(clause, opIndex, isLastOperative)}
				</li>
			{/each}
		</ol>
	{/if}

	<!-- Render blocks of an operative clause -->
	{#snippet operativeClauseBlocks(clause: OperativeClause, opIndex: number, isLastOperative: boolean)}
		{#each clause.blocks as block, blockIndex}
			{@const isLastBlock = blockIndex === clause.blocks.length - 1}
			{#if block.type === 'text'}
				{@const formatted = formatClauseContent(block.content, operativePatterns)}
				{@const nextBlock = clause.blocks[blockIndex + 1]}
				{@const hasMoreContent = !isLastBlock || (nextBlock && nextBlock.type === 'subclauses')}
				{#if block.content.trim()}
					{#if blockIndex === 0}
						<!-- First text block gets italicized phrase -->
						<span class="italic">{formatted.firstPhrase}</span>{formatted.rest}{#if isLastBlock && isLastOperative}.{:else if !hasMoreContent};{/if}
					{:else}
						<!-- Continuation text blocks (after subclauses) -->
						<p class="continuation-text">{block.content.trim()}{#if isLastBlock && isLastOperative}.{:else if !hasMoreContent};{/if}</p>
					{/if}
				{/if}
			{:else if block.type === 'subclauses'}
				{@const nonEmptyItems = block.items.filter((s) => !isClauseEmpty(s))}
				{#if nonEmptyItems.length > 0}
					{@render subClauseList(nonEmptyItems, 1, isLastOperative && isLastBlock)}
				{/if}
			{/if}
		{/each}
	{/snippet}

	<!-- Render a list of subclauses at a given depth -->
	{#snippet subClauseList(subClauses: SubClause[], depth: number, isLastInParent: boolean)}
		<ol class="sub-clause-section depth-{depth}">
			{#each subClauses as subClause, index}
				{@const isLastSubClause = index === subClauses.length - 1}
				<li class="sub-clause">
					<span class="sub-clause-label">{getSubClauseLabel(index, depth)}</span>
					{@render subClauseBlocks(subClause, depth, isLastInParent && isLastSubClause)}
				</li>
			{/each}
		</ol>
	{/snippet}

	<!-- Render blocks within a subclause -->
	{#snippet subClauseBlocks(subClause: SubClause, depth: number, isLastInParent: boolean)}
		{#each subClause.blocks as block, blockIndex}
			{@const isLastBlock = blockIndex === subClause.blocks.length - 1}
			{#if block.type === 'text'}
				{#if block.content.trim()}
					{#if blockIndex === 0}
						<!-- First text block content -->
						{block.content.trim()}{#if isLastBlock}{#if isLastInParent && depth === 1}.{:else};{/if}{/if}
					{:else}
						<!-- Continuation text after nested subclauses -->
						<p class="continuation-text">{block.content.trim()}{#if isLastBlock}{#if isLastInParent && depth === 1}.{:else};{/if}{/if}</p>
					{/if}
				{/if}
			{:else if block.type === 'subclauses'}
				{@const nonEmptyItems = block.items.filter((s) => !isClauseEmpty(s))}
				{#if nonEmptyItems.length > 0 && depth < 4}
					{@render subClauseList(nonEmptyItems, depth + 1, isLastInParent && isLastBlock)}
				{/if}
			{/if}
		{/each}
	{/snippet}

	<!-- Empty state -->
	{#if nonEmptyPreamble.length === 0 && nonEmptyOperative.length === 0}
		<div class="text-center text-base-content/50 py-8">
			<i class="fa-solid fa-file-lines text-4xl mb-2"></i>
			<p>No clauses yet. Add preamble or operative clauses to see the preview.</p>
		</div>
	{/if}
</div>

<style>
	.resolution-preview {
		font-family: 'Times New Roman', Times, serif;
		font-size: 0.95rem;
		line-height: 1.7;
		width: 100%;
		max-width: 900px;
		padding: 2rem;
		background: white;
		color: #1a1a1a;
	}

	/* Watermark Disclaimer */
	.watermark-disclaimer {
		color: #9ca3af;
		font-size: 0.75rem;
		text-align: center;
		margin-bottom: 1.5rem;
		line-height: 1.4;
	}

	/* UN Header Row */
	.un-header-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
	}

	.un-title {
		font-size: 1.1rem;
	}

	.document-number {
		text-align: right;
	}

	.doc-abbrev {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.doc-rest {
		font-size: 0.9rem;
	}

	/* Dividers */
	.thin-divider {
		border: none;
		border-top: 1px solid #1a1a1a;
		margin: 0.5rem 0 1rem 0;
	}

	.thick-divider {
		border: none;
		border-top: 3px solid #1a1a1a;
		margin: 1.5rem 0 2rem 0;
	}

	/* Committee Section */
	.committee-section {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.un-emblem {
		width: 70px;
		height: 70px;
		flex-shrink: 0;
	}

	.committee-name {
		font-size: 1.8rem;
		font-weight: bold;
		line-height: 1.2;
		padding-top: 0.25rem;
	}

	/* Metadata Sections */
	.metadata-section {
		margin-bottom: 1rem;
	}

	.metadata-label {
		font-weight: bold;
		text-transform: uppercase;
		font-size: 0.85rem;
	}

	.metadata-value {
		margin-left: 1.5rem;
		font-size: 1rem;
	}

	/* Small Disclaimer */
	.small-disclaimer {
		color: #6b7280;
		font-size: 0.65rem;
		line-height: 1.4;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	/* Resolution Content */
	.resolution-header {
		font-style: italic;
		margin-bottom: 1.5rem;
	}

	.preamble-section {
		margin-bottom: 1.5rem;
	}

	.preamble-clause {
		margin-bottom: 0.75rem;
	}

	.operative-section {
		list-style: none;
		padding-left: 0;
		counter-reset: operative-counter;
	}

	.operative-clause {
		counter-increment: operative-counter;
		padding-left: 2.5rem;
		position: relative;
		margin-bottom: 0.5rem;
	}

	.operative-clause::before {
		content: counter(operative-counter) '.';
		position: absolute;
		left: 0;
		font-weight: bold;
	}

	/* Continuation text (text blocks after subclauses) */
	.continuation-text {
		margin-top: 0.5rem;
		margin-bottom: 0.25rem;
	}

	/* Sub-clause styles */
	.sub-clause-section {
		list-style: none;
		padding-left: 0;
		margin: 0.5rem 0 0 0;
	}

	.sub-clause {
		position: relative;
		padding-left: 2rem;
		margin-bottom: 0.25rem;
	}

	.sub-clause-label {
		position: absolute;
		left: 0;
		font-weight: normal;
		min-width: 1.8rem;
	}

	/* Depth-based indentation */
	.depth-1 {
		margin-left: 0;
	}

	.depth-2 {
		margin-left: 1.5rem;
	}

	.depth-3 {
		margin-left: 3rem;
	}

	.depth-4 {
		margin-left: 4.5rem;
	}
</style>
