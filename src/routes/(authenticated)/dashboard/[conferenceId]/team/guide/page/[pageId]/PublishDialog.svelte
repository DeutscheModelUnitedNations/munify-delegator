<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';

	/** Confirms a publish after showing whom it reaches (`guidePagePublishPreview`). */
	interface Props {
		pageId: string;
		open: boolean;
		onPublish: () => Promise<void>;
	}

	let { pageId, open = $bindable(), onPublish }: Props = $props();

	const preview = $derived(
		open
			? await client.query.guidePagePublishPreview({
					__args: { id: pageId },
					firstPublish: true,
					titleChanges: true,
					textChanges: true,
					scopeChanges: true,
					reaches: { id: true, title: true },
					stopsReaching: { id: true, title: true }
				})
			: null
	);

	let publishing = $state(false);
	async function publish() {
		publishing = true;
		try {
			await onPublish();
			open = false;
		} finally {
			publishing = false;
		}
	}
</script>

<Modal bind:open title={m.guidePublishPage()}>
	{#if preview}
		<div class="flex flex-col gap-3" data-testid="guide-publish-preview">
			<p>{preview.firstPublish ? m.guidePublishFirst() : m.guidePublishAgain()}</p>
			{#if !preview.firstPublish && !preview.titleChanges && !preview.textChanges && !preview.scopeChanges}
				<p class="text-warning">{m.guidePublishNothingChanged()}</p>
			{/if}
			<div>
				<h3 class="font-semibold">{m.guidePublishReaches({ count: preview.reaches.length })}</h3>
				<ul class="list-inside list-disc text-sm">
					{#each preview.reaches as conference (conference.id)}<li>{conference.title}</li>{/each}
				</ul>
			</div>
			{#if preview.stopsReaching.length > 0}
				<div class="alert alert-warning">
					<i class="ph-duotone ph-warning" aria-hidden="true"></i>
					<span>
						{m.guidePublishStopsReaching({
							conferences: preview.stopsReaching.map((conference) => conference.title).join(', ')
						})}
					</span>
				</div>
			{/if}
		</div>
	{/if}
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-success"
			type="button"
			disabled={publishing || !preview}
			onclick={publish}
		>
			<i class="ph-duotone ph-upload-simple" aria-hidden="true"></i>
			{m.guidePublishPage()}
		</button>
	{/snippet}
</Modal>
