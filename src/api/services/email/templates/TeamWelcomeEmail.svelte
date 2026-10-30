<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import EmailLayout from './EmailLayout.svelte';
	import EmailButton from './EmailButton.svelte';
	import EmailParagraphs from './EmailParagraphs.svelte';
	import { smallStyle } from './brand';

	/**
	 * The note to someone with an account who was added to a conference's team. Heading and
	 * paragraphs are the conference's text (`TEAM_WELCOME` in `#lib/helpers/emailTemplates`); the
	 * greeting, the button and the footer stay fixed.
	 */
	interface Props {
		recipientName: string;
		recipientEmail: string;
		conferenceTitle: string;
		heading: string;
		paragraphs: string[];
		dashboardUrl: string;
		/** The conference's footer, paragraph by paragraph. */
		conferenceFooter?: string[];
	}

	let {
		recipientName,
		recipientEmail,
		conferenceTitle,
		heading,
		paragraphs,
		dashboardUrl,
		conferenceFooter
	}: Props = $props();
</script>

<EmailLayout {heading} {conferenceTitle} preview={paragraphs[0]} {conferenceFooter}>
	<EmailParagraphs greeting={m.emailGreeting({ name: recipientName })} {paragraphs} />

	<EmailButton href={dashboardUrl} label={m.emailTeamWelcomeButton()} />

	{#snippet footer()}
		<p style={smallStyle}>{m.emailSentTo({ email: recipientEmail })}</p>
	{/snippet}
</EmailLayout>
