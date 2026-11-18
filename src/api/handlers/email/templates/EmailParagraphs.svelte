<script lang="ts">
	import { textStyle } from './brand';
	import EmailText from './EmailText.svelte';

	/** The greeting and the paragraphs of a mail whose text the conference writes. */
	interface Props {
		greeting: string;
		paragraphs: string[];
	}

	let { greeting, paragraphs }: Props = $props();
</script>

<p style={textStyle}>{greeting}</p>
{#each paragraphs as paragraph, index (index)}
	<EmailText {paragraph} />
{/each}
