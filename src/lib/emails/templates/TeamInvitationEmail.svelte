<script lang="ts">
	import { Html, Head, Body, Container, Section, Text, Link, Hr } from 'better-svelte-email';

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

<Html lang="de">
	<Head>
		<title>Einladung ins Organisationsteam</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;">
					Einladung ins Organisationsteam
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">Hallo,</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{inviterName} hat dich eingeladen, dich als Teammitglied der Konferenz
					<strong>{conferenceTitle}</strong>
					als <strong>{roleName}</strong> zu akreditieren.
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					Klicke auf den Button unten, um dein Konto zu erstellen und der Konferenz beizutreten.
				</Text>

				<Section style="text-align: center; margin: 32px 0;">
					<Link
						href={inviteUrl}
						style="background-color: #3d7dd2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						Einladung annehmen
					</Link>
				</Section>

				<Text style="font-size: 14px; color: #6b7280; line-height: 1.6;">
					Dieser Link ist gültig bis {expiresAt}. Nach Ablauf kannst du bei {inviterName} eine neue Einladung
					anfordern.
				</Text>

				<Hr style="border-color: #e5e7eb; margin: 24px 0;" />

				<Text style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
					Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
				</Text>
				<Text style="font-size: 12px; color: #6b7280; word-break: break-all;">
					{inviteUrl}
				</Text>

				<Hr style="border-color: #e5e7eb; margin: 24px 0;" />

				<Text style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
					Diese E-Mail wurde an {recipientEmail} gesendet. Wenn du diese Einladung nicht erwartet hast,
					kannst du diese E-Mail ignorieren.
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
