<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import DiscussionPointsEditor from '#lib/components/discussionPoints/DiscussionPointsEditor.svelte';

	let {
		title = $bindable(),
		teaserText = $bindable(),
		discussionPoints = $bindable()
	}: { title: string; teaserText: string; discussionPoints: string[] } = $props();
</script>

<div class="flex flex-col gap-4">
	<label class="floating-label">
		<span>{m.title()}</span>
		<input class="input w-full" placeholder={m.title()} bind:value={title} />
	</label>
	<label class="floating-label">
		<span>{m.teaserText()}</span>
		<textarea class="textarea w-full" placeholder={m.teaserText()} bind:value={teaserText}
		></textarea>
	</label>
	<DiscussionPointsEditor bind:points={discussionPoints} />
</div>
