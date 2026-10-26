<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import EmailLayout from '../EmailLayout.svelte';
	import EmailButton from '../EmailButton.svelte';
	import { textStyle } from '../brand';

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

<EmailLayout heading={m.emailNewReviewHeading()} {conferenceTitle}>
	<p style={textStyle}>{m.emailGreeting({ name: recipientName })}</p>
	<p style={textStyle}>
		{m.emailNewReviewBody({ paperType, paperTitle, conferenceTitle, reviewer })}
	</p>
	<p style={textStyle}>{m.emailNewReviewNewStatus()} <strong>{newStatus}</strong></p>

	<EmailButton href={paperUrl} label={m.emailNewReviewButton()} />
</EmailLayout>
