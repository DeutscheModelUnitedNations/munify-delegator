<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import { conflictAwareToastMessages } from '#lib/utils/toast';
	import type { WorkspacePage } from '#lib/guide/workspace';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import StateDot from './StateDot.svelte';

	/**
	 * Publishes the guide's changes in one go: the pages it uses that wait (each picked or not),
	 * then the sidebar, so the sidebar never names an unpublished page.
	 */
	interface Props {
		conferenceId: string;
		pages: readonly WorkspacePage[];
		sidebarChanged: boolean;
	}

	let { conferenceId, pages, sidebarChanged }: Props = $props();

	const draft = getOutlineDraft();
	let open = $state(false);
	let publishing = $state(false);
	let skipped = $state<string[]>([]);
	let withSidebar = $state(true);

	const count = $derived(pages.length + (sidebarChanged ? 1 : 0));
	const picked = $derived(pages.filter((page) => !skipped.includes(page.id)));

	function toggle(pageId: string, on: boolean) {
		skipped = on ? skipped.filter((id) => id !== pageId) : [...skipped, pageId];
	}

	const includeSidebar = $derived(sidebarChanged && withSidebar);

	/** The pages first: the sidebar may only name published pages. */
	async function publishAll() {
		// a sidebar that could not be saved (changed elsewhere) is not published over
		if (!(await draft.flush())) throw new Error(m.guideSidebarSaveFailed());
		for (const page of picked) {
			await client.mutate.publishGuidePage({ __args: { id: page.id }, draftUpdatedAt: true });
		}
		if (includeSidebar) await client.mutate.publishGuideOutline({ __args: { conferenceId } });
	}

	async function publish() {
		publishing = true;
		const promise = publishAll();
		toast.promise(promise, {
			loading: m.guidePublishing(),
			success: m.guidePublished(),
			error: conflictAwareToastMessages.error
		});
		try {
			await promise;
			open = false;
			skipped = [];
		} finally {
			publishing = false;
		}
	}
</script>

<div class="flex flex-col gap-2 pt-3" data-tour="team.guide.publish">
	<p class="text-sm opacity-70">
		{count > 0 ? m.guideTreeChanges({ count }) : m.guideTreeNoChanges()}
	</p>
	<button
		class="btn btn-primary btn-sm"
		disabled={count === 0}
		onclick={() => (open = true)}
		data-testid="guide-publish-changes"
	>
		<i class="ph-duotone ph-upload-simple" aria-hidden="true"></i>
		{m.guideTreeReviewChanges()}
	</button>
</div>

<Modal bind:open title={m.guideTreeReviewChanges()}>
	<div class="flex flex-col gap-3" data-testid="guide-publish-changes-dialog">
		{#if pages.length > 0}
			<fieldset class="fieldset">
				<legend class="fieldset-legend">{m.guidePages()}</legend>
				{#each pages as page (page.id)}
					<label class="label cursor-pointer justify-start gap-3 text-base-content">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							checked={!skipped.includes(page.id)}
							onchange={(event) => toggle(page.id, event.currentTarget.checked)}
						/>
						<StateDot state={page.state} />
						<span class="min-w-0 flex-1">{page.title}</span>
					</label>
				{/each}
			</fieldset>
		{/if}
		{#if sidebarChanged}
			<label class="label cursor-pointer justify-start gap-3 text-base-content">
				<input type="checkbox" class="checkbox checkbox-sm" bind:checked={withSidebar} />
				<i class="ph-duotone ph-list-bullets" aria-hidden="true"></i>
				{m.guideTreeSidebarChanged()}
			</label>
		{/if}
		<p class="text-sm opacity-70">{m.guideTreePublishHint()}</p>
	</div>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			type="button"
			disabled={publishing || (picked.length === 0 && !includeSidebar)}
			onclick={publish}
		>
			<i class="ph-duotone ph-upload-simple" aria-hidden="true"></i>
			{m.guideTreePublish()}
		</button>
	{/snippet}
</Modal>
