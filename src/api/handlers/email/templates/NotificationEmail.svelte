<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import EmailLayout from './EmailLayout.svelte';
	import EmailButton from './EmailButton.svelte';
	import EmailParagraphs from './EmailParagraphs.svelte';
	import { smallStyle, textStyle } from './brand';

	/** One automatic mail to a participant or supervisor (`#api/handlers/email/emailContent`). */
	interface Props {
		heading: string;
		recipientName: string;
		paragraphs: string[];
		items?: string[];
		/** Paragraphs after the list. */
		closing?: string[];
		button?: { label: string; url: string };
		conferenceTitle: string;
		/** The conference's footer, paragraph by paragraph. */
		conferenceFooter?: string[];
	}

	let {
		heading,
		recipientName,
		paragraphs,
		items = [],
		closing = [],
		button,
		conferenceTitle,
		conferenceFooter
	}: Props = $props();
</script>

<EmailLayout {heading} {conferenceTitle} preview={paragraphs[0]} {conferenceFooter}>
	<EmailParagraphs greeting={m.emailGreeting({ name: recipientName })} {paragraphs} />

	{#if items.length > 0}
		<ul style="{textStyle} padding-left: 20px;">
			{#each items as item, index (index)}
				<li style="margin-bottom: 6px;">{item}</li>
			{/each}
		</ul>
	{/if}

	{#each closing as paragraph, index (index)}
		<p style={textStyle}>{paragraph}</p>
	{/each}

	{#if button}
		<EmailButton href={button.url} label={button.label} />
	{/if}

	{#snippet footer()}
		<p style={smallStyle}>{m.emailAutoFooter({ conferenceTitle })}</p>
	{/snippet}
</EmailLayout>
