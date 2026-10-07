<script lang="ts">
	import type { DiffSegment } from './types';
	import { splitIntoDiffLines } from './diffUtils';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		title: string;
		versionNumber: number;
		date: Date;
		segments: DiffSegment[];
	}

	let { title, versionNumber, date, segments }: Props = $props();

	let lines = $derived(splitIntoDiffLines(segments));
</script>

<div class="diff-panel flex flex-col h-full border border-base-300 rounded-box">
	<div class="panel-header bg-base-200 p-3 rounded-t-box border-b border-base-300">
		<div class="flex items-center gap-2 flex-wrap">
			<span class="font-semibold">{title}</span>
			<span class="badge badge-sm badge-primary">{m.version()} {versionNumber}</span>
			<span class="text-xs text-base-content/60">
				{date.toLocaleDateString()}
				{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
			</span>
		</div>
	</div>

	<div class="panel-content bg-base-100 rounded-b-box flex-1 overflow-auto">
		<div class="diff-content font-mono text-sm">
			{#each lines as line, lineIndex (lineIndex)}
				<div
					class="diff-line flex"
					class:line-has-insert={line.changeType === 'insert'}
					class:line-has-delete={line.changeType === 'delete'}
					class:line-has-mixed={line.changeType === 'mixed'}
				>
					<!-- Gutter marker -->
					<div
						class="diff-gutter w-1 shrink-0"
						class:gutter-insert={line.changeType === 'insert'}
						class:gutter-delete={line.changeType === 'delete'}
						class:gutter-mixed={line.changeType === 'mixed'}
					></div>

					<!-- Line content -->
					<div class="diff-line-content flex-1 px-3 py-0.5 whitespace-pre-wrap break-words">
						{#each line.parts as part, partIndex (partIndex)}
							{#if part.type === 'insert'}
								<mark class="diff-insert">{part.text}</mark>
							{:else if part.type === 'delete'}
								<del class="diff-delete">{part.text}</del>
							{:else}
								<span>{part.text}</span>
							{/if}
						{/each}
						{#if line.parts.length === 0 || line.parts.every((p) => p.text === '')}
							<span class="opacity-0">.</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	/* Line backgrounds - using theme colors with transparency */
	.diff-line.line-has-insert {
		background-color: color-mix(in srgb, var(--color-success) 15%, transparent);
	}

	.diff-line.line-has-delete {
		background-color: color-mix(in srgb, var(--color-error) 15%, transparent);
	}

	.diff-line.line-has-mixed {
		background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
	}

	/* Gutter markers - solid theme colors */
	.diff-gutter {
		background-color: transparent;
	}

	.diff-gutter.gutter-insert {
		background-color: var(--color-success);
	}

	.diff-gutter.gutter-delete {
		background-color: var(--color-error);
	}

	.diff-gutter.gutter-mixed {
		background-color: var(--color-warning);
	}

	/* Inline highlights - theme colors with content colors for text */
	.diff-content :global(.diff-insert) {
		background-color: color-mix(in srgb, var(--color-success) 35%, transparent);
		color: var(--color-success-content);
		border-radius: 3px;
		padding: 1px 4px;
		text-decoration: none;
		font-weight: 500;
	}

	.diff-content :global(.diff-delete) {
		background-color: color-mix(in srgb, var(--color-error) 35%, transparent);
		color: var(--color-error-content);
		border-radius: 3px;
		padding: 1px 4px;
		text-decoration: line-through;
		font-weight: 500;
	}

	.panel-content {
		min-height: 200px;
		max-height: 60vh;
	}
</style>
