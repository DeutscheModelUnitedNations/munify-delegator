<script lang="ts" generics="D extends { savedAt: number }, C">
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { DraftAutosave } from './draftAutosave.svelte';
	import { formatRelativeTime } from './relativeTime';

	let { draft }: { draft: DraftAutosave<D, C> } = $props();
</script>

<Modal bind:open={draft.showRecoveryModal} title={m.paperDraftRecoveryTitle()}>
	<p class="mb-2">{m.paperDraftRecoveryMessage()}</p>
	<p class="text-sm text-base-content/70">
		{m.paperDraftSavedAgo({ time: formatRelativeTime(draft.savedDraft?.savedAt) })}
	</p>
	{#snippet action()}
		<button class="btn" onclick={() => draft.startFresh()}>{m.paperStartFresh()}</button>
		<button class="btn btn-primary" onclick={() => draft.restore()}>{m.paperRestoreDraft()}</button>
	{/snippet}
</Modal>
