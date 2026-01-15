<script lang="ts">
	import type { Resolution, SubClause } from '$lib/schemata/resolution';
	import { getSubClauseLabel } from '$lib/schemata/resolution';
	import {
		type PhrasePattern,
		loadPhrasePatterns,
		validatePhrase
	} from '$lib/services/phraseValidation';

	interface Props {
		resolution: Resolution;
	}

	let { resolution }: Props = $props();

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
</script>

<div class="resolution-preview">
	<!-- Header -->
	<div class="resolution-header">
		{resolution.committeeName.toUpperCase()},
	</div>

	<!-- Preamble Section -->
	{#if resolution.preamble.length > 0}
		<div class="preamble-section">
			{#each resolution.preamble as clause}
				{@const formatted = formatClauseContent(clause.content, preamblePatterns)}
				<p class="preamble-clause">
					<span class="italic">{formatted.firstPhrase}</span>{formatted.rest},
				</p>
			{/each}
		</div>
	{/if}

	<!-- Operative Section -->
	{#if resolution.operative.length > 0}
		<ol class="operative-section">
			{#each resolution.operative as clause, index}
				{@const formatted = formatClauseContent(clause.content, operativePatterns)}
				{@const isLast = index === resolution.operative.length - 1}
				{@const hasSubClauses = clause.subClauses && clause.subClauses.length > 0}
				<li class="operative-clause">
					<span class="italic">{formatted.firstPhrase}</span>{formatted.rest}{#if !hasSubClauses}{isLast ? '.' : ';'}{/if}
					{#if hasSubClauses}
						{@render subClauseList(clause.subClauses!, 1, isLast)}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}

	{#snippet subClauseList(subClauses: SubClause[], depth: number, isLastOperative: boolean)}
		<ol class="sub-clause-section depth-{depth}">
			{#each subClauses as subClause, index}
				{@const formatted = formatClauseContent(subClause.content, [])}
				{@const isLast = index === subClauses.length - 1}
				{@const hasChildren = subClause.children && subClause.children.length > 0}
				<li class="sub-clause">
					<span class="sub-clause-label">{getSubClauseLabel(index, depth)}</span>
					{subClause.content.trim()}{#if !hasChildren}{#if isLast && isLastOperative && depth === 1}.{:else};{/if}{/if}
					{#if hasChildren}
						{@render subClauseList(subClause.children!, depth + 1, isLastOperative && isLast)}
					{/if}
				</li>
			{/each}
		</ol>
	{/snippet}

	<!-- Empty state -->
	{#if resolution.preamble.length === 0 && resolution.operative.length === 0}
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

	.resolution-header {
		text-transform: uppercase;
		font-weight: bold;
		margin-bottom: 1.5rem;
		letter-spacing: 0.05em;
	}

	.preamble-section {
		margin-bottom: 1.5rem;
	}

	.preamble-clause {
		text-indent: 2rem;
		margin-bottom: 0.25rem;
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
