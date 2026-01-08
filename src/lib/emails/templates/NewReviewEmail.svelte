<script lang="ts">
	import { Html, Head, Body, Container, Section, Text, Link, Hr } from 'svelte-email';

	interface Props {
		recipientName: string;
		paperTitle: string;
		paperType: string;
		reviewerName: string;
		conferenceTitle: string;
		paperUrl: string;
	}

	let {
		recipientName,
		paperTitle,
		paperType,
		reviewerName,
		conferenceTitle,
		paperUrl
	}: Props = $props();
</script>

<Html lang="de">
	<Head>
		<title>Neues Review für dein Paper</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text
					style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;"
				>
					Neues Review erhalten
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					Hallo {recipientName},
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					dein {paperType}
					<strong>"{paperTitle}"</strong>
					für die Konferenz
					<strong>{conferenceTitle}</strong>
					hat ein neues Review von
					<strong>{reviewerName}</strong>
					erhalten.
				</Text>

				<Section style="text-align: center; margin: 32px 0;">
					<Link
						href={paperUrl}
						style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						Review ansehen
					</Link>
				</Section>

				<Hr style="border-color: #e5e7eb; margin: 24px 0;" />

				<Text style="font-size: 14px; color: #6b7280; line-height: 1.5;">
					Diese E-Mail wurde automatisch vom MUNIFY Delegator System versendet. Bitte
					antworte nicht auf diese E-Mail.
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
