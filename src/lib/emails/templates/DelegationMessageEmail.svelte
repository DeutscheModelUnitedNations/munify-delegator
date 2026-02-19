<script lang="ts">
	import { Html, Head, Body, Container, Section, Text, Link, Hr } from 'better-svelte-email';

	interface Props {
		senderLabel: string;
		senderInitials: string;
		subject: string;
		messageBody: string;
		conferenceTitle: string;
		replyUrl: string;
		quotedMessage?: {
			senderLabel: string;
			senderInitials: string;
			subject: string;
			body: string;
			sentAt: string;
		};
	}

	let {
		senderLabel,
		senderInitials,
		subject,
		messageBody,
		conferenceTitle,
		replyUrl,
		quotedMessage
	}: Props = $props();
	const messageLines = messageBody.split(/\r?\n/);
	const quotedLines = quotedMessage?.body.split(/\r?\n/) ?? [];
</script>

<Html lang="de">
	<Head>
		<title>{subject}</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 32px; border-radius: 8px; max-width: 600px;"
		>
			<!-- A. Conference badge -->
			<Text
				style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;"
			>
				{conferenceTitle}
			</Text>

			<!-- B. Sender identity -->
			<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
				<tbody>
					<tr>
						<td
							style="width: 36px; height: 36px; background-color: #6366f1; border-radius: 18px; text-align: center; vertical-align: middle; color: #ffffff; font-size: 14px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
						>
							{senderInitials}
						</td>
						<td style="padding-left: 10px; vertical-align: middle;">
							<Text
								style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0; line-height: 1.2;"
							>
								{senderLabel}
							</Text>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- C. Subject -->
			<Text style="font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 16px 0;">
				{subject}
			</Text>

			<!-- D. Message body -->
			<Section style="margin: 0 0 24px 0;">
				{#each messageLines as line}
					<Text style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0;">
						{line || '\u00A0'}
					</Text>
				{/each}
			</Section>

			<!-- E. Reply button -->
			<Section style="text-align: center; margin: 0 0 28px 0;">
				<Link
					href={replyUrl}
					style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
				>
					Antworten
				</Link>
			</Section>

			<!-- F. Quoted thread -->
			{#if quotedMessage}
				<Section
					style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;"
				>
					<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
						<tbody>
							<tr>
								<td
									style="width: 28px; height: 28px; background-color: #d1d5db; border-radius: 14px; text-align: center; vertical-align: middle; color: #6b7280; font-size: 11px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
								>
									{quotedMessage.senderInitials}
								</td>
								<td style="padding-left: 8px; vertical-align: middle;">
									<Text style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.2;">
										{quotedMessage.senderLabel} &middot; {quotedMessage.sentAt}
									</Text>
								</td>
							</tr>
						</tbody>
					</table>
					<Text style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 6px 0;">
						{quotedMessage.subject}
					</Text>
					{#each quotedLines as line}
						<Text style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin: 0;">
							{line || '\u00A0'}
						</Text>
					{/each}
				</Section>
			{/if}

			<!-- G. Footer -->
			<Hr style="border-color: #e5e7eb; margin: 0 0 16px 0;" />
			<Text style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0;">
				Gesendet über {conferenceTitle}. Deine E-Mail-Adresse wurde nicht offengelegt. Bitte
				antworte nicht direkt auf diese E-Mail, sondern nutze den Button oben.
			</Text>
		</Container>
	</Body>
</Html>
