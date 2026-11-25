<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import {
		addSection,
		setTemplateEnabled,
		setTopicOverviewEnabled
	} from '#lib/guide/outlineEditing';
	import { getOutlineDraft } from '../outlineDraft.svelte';

	/** Below the tree: a new section, and the committee template or topic overview while missing. */
	const draft = getOutlineDraft();
	const outline = $derived(draft.outline);
</script>

<div class="flex flex-wrap gap-1 pt-3">
	<button
		class="btn btn-ghost btn-xs"
		onclick={() => draft.change(addSection({ outline, title: m.guideNewSection() }))}
	>
		<i class="ph-duotone ph-plus" aria-hidden="true"></i>
		{m.guideAddSection()}
	</button>
	{#if !outline.committeeTemplate}
		<button
			class="btn btn-ghost btn-xs"
			onclick={() => draft.change(setTemplateEnabled({ outline, enabled: true }))}
		>
			<i class="ph-duotone ph-users-three" aria-hidden="true"></i>
			{m.guideTreeAddTemplate()}
		</button>
	{/if}
	{#if !outline.topicOverview}
		<button
			class="btn btn-ghost btn-xs"
			onclick={() =>
				draft.change(
					setTopicOverviewEnabled({ outline, enabled: true, title: m.guideTopicOverviewTitle() })
				)}
		>
			<i class="ph-duotone ph-books" aria-hidden="true"></i>
			{m.guideTreeAddTopics()}
		</button>
	{/if}
</div>
