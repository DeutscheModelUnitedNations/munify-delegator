<script lang="ts">
	import { brand, textStyle } from './brand';
	import { inlineParts } from './inlineLinks';

	/** One paragraph of a mail's text, its `[label](url)` links drawn as links (`inlineParts`). */
	let { paragraph }: { paragraph: string } = $props();

	const linkStyle = `color: ${brand.primary}; text-decoration: underline;`;
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- absolute links in a mail, not routes of this app -->
<p style={textStyle}>
	{#each inlineParts(paragraph) as part, index (index)}{#if part.href}<a
				href={part.href}
				style={linkStyle}>{part.text}</a
			>{:else}{part.text}{/if}{/each}
</p>
