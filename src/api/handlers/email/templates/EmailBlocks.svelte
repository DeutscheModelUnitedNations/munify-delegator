<script lang="ts">
	import EmailText from './EmailText.svelte';
	import { textStyle } from './brand';
	import type { MailBlock } from '../announcementBlocks';

	/** A text as blocks (an announcement's own): headings, paragraphs and lists. */
	interface Props {
		blocks: MailBlock[];
	}

	let { blocks }: Props = $props();
</script>

{#each blocks as block, index (index)}
	{#if block.type === 'heading'}
		<p style="{textStyle} font-weight: 700;">{block.text}</p>
	{:else if block.type === 'paragraph'}
		<EmailText paragraph={block.text} />
	{:else}
		<svelte:element this={block.ordered ? 'ol' : 'ul'} style="{textStyle} padding-left: 20px;">
			{#each block.items as item, itemIndex (itemIndex)}
				<li style="margin-bottom: 6px; white-space: pre-line;">{item}</li>
			{/each}
		</svelte:element>
	{/if}
{/each}
