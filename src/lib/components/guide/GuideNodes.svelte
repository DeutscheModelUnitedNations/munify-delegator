<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import GuideNodes from './GuideNodes.svelte';
	import type { GuideNode } from '#lib/guide/document';
	import GuideText from './nodes/GuideText.svelte';
	import GuideBasicBlock from './nodes/GuideBasicBlock.svelte';
	import GuideImage from './nodes/GuideImage.svelte';
	import GuideCallout from './nodes/GuideCallout.svelte';
	import GuideToggle from './nodes/GuideToggle.svelte';
	import GuideButton from './nodes/GuideButton.svelte';
	import GuideRule from './nodes/GuideRule.svelte';
	import GuideBreak from './nodes/GuideBreak.svelte';
	import GuideVideo from './nodes/GuideVideo.svelte';

	/**
	 * Renders guide nodes for readers (`GuideContent.svelte`), one component per node type: the API
	 * already filled placeholders, turned file references into URLs and dropped links to pages
	 * outside the reader's guide. Links to pages of the guide (`guide:<id>`) go through `pageHref`.
	 * An unknown node shows its children.
	 */
	interface Props {
		nodes: readonly GuideNode[] | undefined;
		pageHref: (pageId: string) => string;
	}

	let { nodes, pageHref }: Props = $props();

	type NodeComponent = Component<{
		node: GuideNode;
		pageHref: (pageId: string) => string;
		children?: Snippet;
	}>;
	const COMPONENTS: Record<string, NodeComponent> = {
		text: GuideText,
		hardBreak: GuideBreak,
		paragraph: GuideBasicBlock,
		heading: GuideBasicBlock,
		bulletList: GuideBasicBlock,
		orderedList: GuideBasicBlock,
		listItem: GuideBasicBlock,
		blockquote: GuideBasicBlock,
		horizontalRule: GuideRule,
		image: GuideImage,
		callout: GuideCallout,
		toggle: GuideToggle,
		button: GuideButton,
		embed: GuideVideo
	};
</script>

{#each nodes ?? [] as node, index (index)}
	{@const NodeView = COMPONENTS[node.type] ?? GuideBasicBlock}
	<NodeView {node} {pageHref}>
		{#if node.content}<GuideNodes nodes={node.content} {pageHref} />{/if}
	</NodeView>
{/each}
