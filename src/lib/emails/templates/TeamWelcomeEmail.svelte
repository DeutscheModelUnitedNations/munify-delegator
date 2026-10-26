<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import EmailLayout from '../EmailLayout.svelte';
	import EmailButton from '../EmailButton.svelte';
	import { smallStyle, textStyle } from '../brand';

	interface Props {
		recipientName: string;
		recipientEmail: string;
		conferenceTitle: string;
		roleName: string;
		inviterName: string;
		dashboardUrl: string;
	}

	let {
		recipientName,
		recipientEmail,
		conferenceTitle,
		roleName,
		inviterName,
		dashboardUrl
	}: Props = $props();
</script>

<EmailLayout heading={m.emailTeamWelcomeTitle()} {conferenceTitle}>
	<p style={textStyle}>{m.emailGreeting({ name: recipientName })}</p>
	<p style={textStyle}>{m.emailTeamWelcomeBody({ inviterName, conferenceTitle, roleName })}</p>
	<p style={textStyle}>{m.emailTeamWelcomeInstruction()}</p>

	<EmailButton href={dashboardUrl} label={m.emailTeamWelcomeButton()} />

	{#snippet footer()}
		<p style={smallStyle}>{m.emailSentTo({ email: recipientEmail })}</p>
	{/snippet}
</EmailLayout>
