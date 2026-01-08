<script lang="ts">
	import { Html, Head, Body, Container, Section, Text, Link, Hr } from 'better-svelte-email';

	interface Props {
		recipientName: string;
		paperTitle: string;
		paperType: string;
		reviewerName: string;
		reviewerEmail: string;
		newStatus: string;
		conferenceTitle: string;
		paperUrl: string;
	}

	let {
		recipientName,
		paperTitle,
		paperType,
		reviewerName,
		reviewerEmail,
		newStatus,
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
				<Text style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;">
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
					hat neues Feedback von {reviewerName}
					(<Link href={`mailto:${reviewerEmail}`}>{reviewerEmail}</Link>) erhalten.
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					Neuer Status: <strong>{newStatus}</strong>
				</Text>

				<Section style="text-align: center; margin: 32px 0;">
					<Link
						href={paperUrl}
						style="background-color: #3d7dd2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						Review ansehen
					</Link>
				</Section>
			</Section>
		</Container>
	</Body>
</Html>
