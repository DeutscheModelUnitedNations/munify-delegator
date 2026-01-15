<script lang="ts">
	import type { Resolution } from '$lib/schemata/resolution';

	interface Props {
		resolution: Resolution;
	}

	let { resolution }: Props = $props();

	// Helper to extract and format the first word/phrase for italics
	function formatClauseContent(content: string): { firstPhrase: string; rest: string } {
		const trimmed = content.trim();
		if (!trimmed) return { firstPhrase: '', rest: '' };

		// Match first word or multi-word phrase patterns
		const multiWordPatterns = [
			/^(In\s+\S+)/i,
			/^(Unter\s+\S+)/i,
			/^(Zur\s+\S+)/i,
			/^(Nach\s+\S+)/i,
			/^(Im\s+\S+)/i,
			/^(Deeply\s+\S+)/i,
			/^(Gravely\s+\S+)/i,
			/^(Strongly\s+\S+)/i,
			/^(Taking\s+\S+)/i,
			/^(Bearing\s+\S+)/i,
			/^(Having\s+\S+)/i,
			/^(Noting\s+with\s+\S+)/i,
			/^(Further\s+\S+)/i,
			/^(Also\s+\S+)/i,
			/^(Calls\s+\S+)/i,
			/^(Zutiefst\s+\S+)/i
		];

		for (const pattern of multiWordPatterns) {
			const match = trimmed.match(pattern);
			if (match) {
				return {
					firstPhrase: match[1],
					rest: trimmed.slice(match[1].length)
				};
			}
		}

		// Fall back to first word
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
				{@const formatted = formatClauseContent(clause.content)}
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
				{@const formatted = formatClauseContent(clause.content)}
				{@const isLast = index === resolution.operative.length - 1}
				<li class="operative-clause">
					<span class="italic">{formatted.firstPhrase}</span>{formatted.rest}{isLast ? '.' : ';'}
				</li>
			{/each}
		</ol>
	{/if}

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
		max-width: 700px;
		margin: 0 auto;
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
</style>
