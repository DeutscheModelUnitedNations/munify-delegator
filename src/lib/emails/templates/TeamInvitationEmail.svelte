<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import EmailLayout from '../EmailLayout.svelte';
	import EmailButton from '../EmailButton.svelte';
	import { ruleStyle, smallStyle, textStyle } from '../brand';

	interface Props {
		recipientEmail: string;
		conferenceTitle: string;
		roleName: string;
		inviterName: string;
		inviteUrl: string;
		expiresAt: string;
	}

	let { recipientEmail, conferenceTitle, roleName, inviterName, inviteUrl, expiresAt }: Props =
		$props();
</script>

<EmailLayout heading={m.emailTeamInvitationTitle()} {conferenceTitle}>
	<p style={textStyle}>{m.emailGreetingAnonymous()}</p>
	<p style={textStyle}>{m.emailTeamInvitationBody({ inviterName, conferenceTitle, roleName })}</p>
	<p style={textStyle}>{m.emailTeamInvitationInstruction()}</p>

	<EmailButton href={inviteUrl} label={m.emailTeamInvitationButton()} />

	<p style={smallStyle}>{m.emailTeamInvitationExpiry({ expiresAt, inviterName })}</p>

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
