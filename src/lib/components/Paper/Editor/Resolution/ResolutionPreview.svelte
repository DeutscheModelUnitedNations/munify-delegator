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
				rest: trimmed.slice(result.matchedPhrase.length)
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

	// Format date for display (localized)
	function formatDate(date: Date | string | undefined): string {
		const d = date ? new Date(date) : new Date();
		return d.toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<div
	class="resolution-preview w-full max-w-[900px] px-16 py-8 bg-white text-gray-900 text-[0.95rem] leading-[1.7]"
>
	{#if headerData}
		<!-- Header Row: Conference Title left, Document Number right -->
		<div class="flex justify-between items-baseline mb-2">
			<div class="text-lg">
				{headerData.conferenceTitle ?? headerData.conferenceName ?? 'Model United Nations'}
			</div>
			{#if headerData.documentNumber}
				<div class="text-right">
					<span class="text-2xl font-bold">{headerData.committeeAbbreviation}</span><span
						class="text-sm">/{headerData.documentNumber}</span
					>
				</div>
			{/if}
		</div>

		<!-- Thin Divider -->
		<hr class="border-t border-gray-900 my-2 mb-4" />

		<!-- Committee Section with Emblem -->
		<div class="flex justify-between">
			<div class="flex items-start gap-4 mb-6">
				<img
					src={headerData.conferenceEmblem ?? unEmblem}
					alt="Conference Emblem"
					class="w-[70px] h-[70px] shrink-0"
				/>
				<div class="text-3xl font-bold leading-tight pt-1">
					{headerData.committeeFullName ?? resolution.committeeName}
				</div>
			</div>

			<!-- Date below divider -->
			<div class="text-right text-sm mb-4">
				{formatDate(headerData.lastEdited)}
			</div>
		</div>

		<!-- Authoring Delegation -->
		{#if headerData.authoringDelegation}
			<div class="mb-4">
				<div class="font-bold uppercase text-sm">{m.resolutionAuthoringDelegation()}</div>
				<div class="ml-6">{headerData.authoringDelegation}</div>
			</div>
		{/if}

		<!-- Small Print Disclaimer -->
		<div class="text-gray-500 text-[0.65rem] leading-snug mt-6 mb-2">
			{disclaimerText}
		</div>

		<!-- Thick Divider -->
		<hr class="border-t-[3px] border-gray-900 mt-6 mb-8" />
	{/if}

	<!-- Topic below thick divider -->
	{#if headerData?.topic}
		<div class="font-bold mb-6">
			{headerData.topic}
		</div>
	{/if}

	<!-- Resolution Content Header -->
	<div class="italic mb-6">
		{#if headerData?.committeeResolutionHeadline}
			{headerData.committeeResolutionHeadline},
		{:else if headerData?.committeeFullName}
			{headerData.committeeFullName},
		{:else}
			{resolution.committeeName.toUpperCase()},
		{/if}
	</div>

	<!-- Preamble Section -->
	{#if nonEmptyPreamble.length > 0}
		<div class="mb-6">
			{#each nonEmptyPreamble as clause}
				{@const formatted = formatClauseContent(clause.content, preamblePatterns)}
				<p class="mb-3 text-justify indent-8">
					<span class="italic">{formatted.firstPhrase}</span>{formatted.rest},
				</p>
			{/each}
		</div>
	{/if}

	<!-- Operative Section -->
	{#if nonEmptyOperative.length > 0}
		<ol class="list-none p-0">
			{#each nonEmptyOperative as clause, opIndex}
				{@const isLastOperative = opIndex === nonEmptyOperative.length - 1}
				<li class="mb-2 text-justify indent-8">
					<span class="font-bold">{opIndex + 1}.</span>
					{@render operativeClauseBlocks(clause, opIndex, isLastOperative)}
				</li>
			{/each}
		</ol>
	{/if}

	<!-- Render blocks of an operative clause -->
	{#snippet operativeClauseBlocks(
		clause: OperativeClause,
		opIndex: number,
		isLastOperative: boolean
	)}
		{#each clause.blocks as block, blockIndex}
			{@const isLastBlock = blockIndex === clause.blocks.length - 1}
			{#if block.type === 'text'}
				{@const formatted = formatClauseContent(block.content, operativePatterns)}
				{#if block.content.trim()}
					{#if blockIndex === 0}
						<!-- First text block gets italicized phrase (inline) -->
						<span class="italic">{formatted.firstPhrase}</span
						>{formatted.rest}{#if isLastBlock && isLastOperative}.{:else};{/if}
					{:else}
						<!-- Continuation text blocks (after subclauses) -->
						<p class="mt-2 mb-1 text-justify indent-8">
							{block.content.trim()}{#if isLastBlock && isLastOperative}.{:else};{/if}
						</p>
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
		<ol class="list-none p-0 mt-2">
			{#each subClauses as subClause, index}
				{@const isLastSubClause = index === subClauses.length - 1}
				<!-- Depth 1: first-line indent only; Depth 2+: all lines indented equally (no first-line indent) -->
				<li class="mb-1 text-justify {depth === 1 ? 'indent-8' : 'pl-8 indent-0'}">
					<span>{getSubClauseLabel(index, depth)}</span>
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
						<!-- First text block content (inline) -->
						{block.content.trim()}{#if isLastBlock && isLastInParent}.{:else};{/if}
					{:else}
						<!-- Continuation text after nested subclauses (parent li already has base indent) -->
						<p class="mt-2 mb-1 text-justify {depth === 1 ? 'indent-8' : 'indent-0'}">
							{block.content.trim()}{#if isLastBlock && isLastInParent}.{:else};{/if}
						</p>
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
			<p>{m.resolutionNoClausesYet()}</p>
		</div>
	{/if}
</div>

<style>
	/* Font family for official document styling */
	.resolution-preview {
		font-family: 'Times New Roman', Times, serif;
	}
</style>
