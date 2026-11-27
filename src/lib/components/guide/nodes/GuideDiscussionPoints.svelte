<script lang="ts">
	import { discussionPointsOf, type GuideNode } from '#lib/guide/document';
	import DiscussionPointsBox from '#lib/components/discussionPoints/DiscussionPointsBox.svelte';

	/** The points for discussion an agenda item page got where `{{Diskussionspunkte}}` stood. */
	let { node }: { node: GuideNode } = $props();

	const { heading, points } = $derived(discussionPointsOf(node));
	const anchor = $derived(typeof node.attrs?.id === 'string' ? node.attrs.id : undefined);
</script>

<div class="not-prose my-6">
	<DiscussionPointsBox {points} {heading} {anchor} />
</div>
