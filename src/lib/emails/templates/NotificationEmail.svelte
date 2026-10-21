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
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';

	/** One automatic mail to a participant or supervisor (`$api/handlers/email/emailContent.ts`). */
	interface Props {
		heading: string;
		recipientName: string;
		paragraphs: string[];
		items?: string[];
		/** Paragraphs after the list. */
		closing?: string[];
		button?: { label: string; url: string };
		conferenceTitle: string;
	}

	let {
		heading,
		recipientName,
		paragraphs,
		items = [],
		closing = [],
		button,
		conferenceTitle
	}: Props = $props();

	const text = 'font-size: 16px; color: #374151; line-height: 1.6;';
</script>

<Html lang={getLocale()}>
	<Head>
		<title>{heading}</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;">
					{heading}
				</Text>

				<Text style={text}>{m.emailGreeting({ name: recipientName })}</Text>

				{#each paragraphs as paragraph, index (index)}
					<Text style={text}>{paragraph}</Text>
				{/each}

				{#if items.length > 0}
					<ul style="{text} padding-left: 20px;">
						{#each items as item, index (index)}
							<li style="margin-bottom: 6px;">{item}</li>
						{/each}
					</ul>
				{/if}

				{#each closing as paragraph, index (index)}
					<Text style={text}>{paragraph}</Text>
				{/each}

				{#if button}
					<Section style="text-align: center; margin: 32px 0;">
						<Link
							href={button.url}
							style="background-color: #3d7dd2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
						>
							{button.label}
						</Link>
					</Section>
				{/if}

				<Text style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 32px;">
					{m.emailAutoFooter({ conferenceTitle })}
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
