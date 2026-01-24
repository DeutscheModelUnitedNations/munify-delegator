<script lang="ts">
	import { Html, Head, Body, Container, Section, Text, Link, Hr } from 'better-svelte-email';

	interface Props {
		senderLabel: string;
		subject: string;
		messageBody: string;
		conferenceTitle: string;
		replyUrl: string;
	}

	let { senderLabel, subject, messageBody, conferenceTitle, replyUrl }: Props = $props();
	const messageLines = messageBody.split(/\r?\n/);
</script>

<Html lang="de">
	<Head>
		<title>Neue Nachricht von Delegierten</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text style="font-size: 22px; font-weight: bold; color: #1a1a1a; margin-bottom: 20px;">
					Neue Nachricht
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">Hallo,</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					du hast eine neue Nachricht von <strong>{senderLabel}</strong> erhalten.
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					Betreff: <strong>{subject}</strong>
				</Text>

				<Section style="border-left: 3px solid #d1d5db; padding-left: 12px; margin: 12px 0;">
					{#each messageLines as line}
						<Text style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0;">
							{line || ' '}
						</Text>
					{/each}
				</Section>

				<Section style="text-align: center; margin: 28px 0;">
					<Link
						href={replyUrl}
						style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						Jetzt antworten
					</Link>
				</Section>

				<Hr style="border-color: #e5e7eb; margin: 20px 0;" />

				<Text style="font-size: 14px; color: #6b7280; line-height: 1.6;">
					Viele Gruesse,<br />Das {conferenceTitle} Team
				</Text>

				<Text style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
					Diese Nachricht wurde ueber das Messaging-System von {conferenceTitle} gesendet. Deine E-Mail-Adresse
					wurde dem Absender nicht offengelegt.
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
