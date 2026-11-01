<script lang="ts">
	import Markdown from '@magidoc/plugin-svelte-marked';
	import MarkdownSafeHtml from './MarkdownSafeHtml.svelte';
	import MarkdownSafeImage from './MarkdownSafeImage.svelte';
	import MarkdownSafeLink from './MarkdownSafeLink.svelte';

	interface Props {
		source: string;
	}

	let { source }: Props = $props();

	/**
	 * The plugin renders raw HTML with `{@html}` and takes any link or image URL as it is, so the
	 * markdown's author could run script in every reader's browser. These replace the three.
	 */
	const renderers = {
		html: MarkdownSafeHtml,
		link: MarkdownSafeLink,
		image: MarkdownSafeImage
	};
</script>

<Markdown {source} {renderers} />
