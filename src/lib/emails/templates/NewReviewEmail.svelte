<script lang="ts">
	import {
		Html,
		Head,
		Body,
		Container,
		Section,
		Text,
		Link
	} from '@better-svelte-email/components';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		recipientName: string;
		paperTitle: string;
		paperType: string;
		reviewerName: string;
		reviewerEmail?: string;
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

	const reviewer = $derived(reviewerEmail ? `${reviewerName} (${reviewerEmail})` : reviewerName);
</script>

<Html lang={getLocale()}>
	<Head>
		<title>{m.emailNewReviewTitle()}</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;">
					{m.emailNewReviewHeading()}
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{m.emailGreeting({ name: recipientName })}
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{m.emailNewReviewBody({ paperType, paperTitle, conferenceTitle, reviewer })}
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{m.emailNewReviewNewStatus()} <strong>{newStatus}</strong>
				</Text>

				<Section style="text-align: center; margin: 32px 0;">
					<Link
						href={paperUrl}
						style="background-color: #3d7dd2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						{m.emailNewReviewButton()}
					</Link>
				</Section>
			</Section>
		</Container>
	</Body>
</Html>
