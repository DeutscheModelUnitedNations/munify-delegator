<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { GuideNode } from '#lib/guide/document';
	import GuideNodes from './GuideNodes.svelte';
	import GuideText from './nodes/GuideText.svelte';
	import GuideBasicBlock from './nodes/GuideBasicBlock.svelte';
	import GuideImage from './nodes/GuideImage.svelte';
	import GuideCallout from './nodes/GuideCallout.svelte';
	import GuideToggle from './nodes/GuideToggle.svelte';
	import GuideButton from './nodes/GuideButton.svelte';
	import GuideVideo from './nodes/GuideVideo.svelte';
	import GuideDiscussionPoints from './nodes/GuideDiscussionPoints.svelte';

	/**
	 * Renders guide nodes for readers (`GuideContent.svelte`), one component per node type: the API
	 * already filled placeholders, turned file references into URLs and dropped links to pages
	 * outside the reader's guide. A node's children come in as a snippet. An unknown node shows its
	 * children.
	 */
	let { nodes }: { nodes: readonly GuideNode[] | undefined } = $props();

	type NodeComponent = Component<{ node: GuideNode; children?: Snippet }>;
	const COMPONENTS: Record<string, NodeComponent> = {
		text: GuideText,
		paragraph: GuideBasicBlock,
		heading: GuideBasicBlock,
		bulletList: GuideBasicBlock,
		orderedList: GuideBasicBlock,
		listItem: GuideBasicBlock,
		blockquote: GuideBasicBlock,
		image: GuideImage,
		callout: GuideCallout,
		toggle: GuideToggle,
		button: GuideButton,
		embed: GuideVideo,
		discussionPoints: GuideDiscussionPoints
	};
</script>

{#each nodes ?? [] as node, index (index)}
	{#if node.type === 'hardBreak'}
		<br />
	{:else if node.type === 'horizontalRule'}
		<hr />
	{:else}
		{@const NodeView = COMPONENTS[node.type] ?? GuideBasicBlock}
		<NodeView {node}>
			{#if node.content}<GuideNodes nodes={node.content} />{/if}
		</NodeView>
	{/if}
{/each}
