<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { DraftSaveState } from './reviewDraft';

	/** Below the review editor: whether the draft is saved, and discarding it. */
	interface Props {
		saveState: DraftSaveState;
		hasDraft: boolean;
		disabled: boolean;
		onDiscard: () => void;
	}

	let { saveState, hasDraft, disabled, onDiscard }: Props = $props();

	const SAVE_LABELS: Record<DraftSaveState, () => string> = {
		idle: () => '',
		saving: () => m.reviewDraftSaving(),
		saved: () => m.reviewDraftSaved(),
		failed: () => m.reviewDraftSaveFailed()
	};
</script>

<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
	<span class={saveState === 'failed' ? 'text-error' : 'text-base-content/60'} aria-live="polite">
		{SAVE_LABELS[saveState]()}
	</span>
	{#if hasDraft}
		<button class="btn btn-ghost btn-sm text-error" onclick={onDiscard} {disabled}>
			<i aria-hidden="true" class="ph-duotone ph-trash"></i>
			{m.reviewDraftDiscard()}
		</button>
	{/if}
</div>
