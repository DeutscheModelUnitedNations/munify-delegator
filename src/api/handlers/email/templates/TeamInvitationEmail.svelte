<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import EmailLayout from './EmailLayout.svelte';
	import EmailButton from './EmailButton.svelte';
	import EmailParagraphs from './EmailParagraphs.svelte';
	import { ruleStyle, smallStyle } from './brand';

	/**
	 * An invitation into a conference's team. Heading and paragraphs are the conference's text
	 * (`TEAM_INVITATION` in `#lib/helpers/emailTemplates`); the greeting, the button, the link
	 * spelled out and the footer stay fixed.
	 */
	interface Props {
		recipientEmail: string;
		conferenceTitle: string;
		heading: string;
		paragraphs: string[];
		inviteUrl: string;
		/** The conference's footer, paragraph by paragraph. */
		conferenceFooter?: string[];
	}

	let { recipientEmail, conferenceTitle, heading, paragraphs, inviteUrl, conferenceFooter }: Props =
		$props();
</script>

<EmailLayout {heading} {conferenceTitle} preview={paragraphs[0]} {conferenceFooter}>
	<EmailParagraphs greeting={m.emailGreetingAnonymous()} {paragraphs} />

	<EmailButton href={inviteUrl} label={m.emailTeamInvitationButton()} />

	<hr style={ruleStyle} />

	<p style={smallStyle}>{m.emailLinkFallback()}</p>
	<p style="{smallStyle} word-break: break-all;">{inviteUrl}</p>

	{#snippet footer()}
		<p style={smallStyle}>
			{m.emailSentTo({ email: recipientEmail })}
			{m.emailTeamInvitationIgnore()}
		</p>
	{/snippet}
</EmailLayout>
