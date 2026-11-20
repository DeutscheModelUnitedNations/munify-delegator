<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/**
	 * What the review editor says about the reviewer's draft (`reviewDraft.ts`): who wrote it and
	 * when, that it was written for an older version, and that it changed meanwhile: rewritten by
	 * an assistant (seen live), or anywhere else (a save refused).
	 */
	interface Props {
		notice: string[];
		staleWarning: string | undefined;
		changed: 'assistant' | 'elsewhere' | undefined;
		onLoadNew: () => void;
		onKeepMine: () => void;
	}

	let { notice, staleWarning, changed, onLoadNew, onKeepMine }: Props = $props();
</script>

{#if notice.length > 0}
	<div class="alert alert-info" data-testid="review-draft-notice">
		<i aria-hidden="true" class="ph-duotone ph-note-pencil"></i>
		<div class="flex flex-col gap-1">
			{#each notice as line (line)}
				<span>{line}</span>
			{/each}
			<span class="text-sm">{m.reviewDraftOnlyYou()}</span>
		</div>
	</div>
{/if}
{#if staleWarning}
	<div class="alert alert-warning" role="alert" data-testid="review-draft-stale">
		<i aria-hidden="true" class="ph-duotone ph-warning"></i>
		<span>{staleWarning}</span>
	</div>
{/if}
{#if changed}
	<div class="alert alert-warning" role="alert" data-testid="review-draft-changed">
		<i aria-hidden="true" class="ph-duotone {changed === 'assistant' ? 'ph-robot' : 'ph-warning'}"
		></i>
		<span>
			{changed === 'assistant'
				? m.reviewDraftChangedByAssistant()
				: m.reviewDraftChangedElsewhere()}
		</span>
		<div class="flex flex-wrap gap-2">
			<button class="btn btn-sm" onclick={onLoadNew}>{m.reviewDraftLoadNew()}</button>
			<button class="btn btn-sm btn-ghost" onclick={onKeepMine}>{m.reviewDraftKeepMine()}</button>
		</div>
	</div>
{/if}
