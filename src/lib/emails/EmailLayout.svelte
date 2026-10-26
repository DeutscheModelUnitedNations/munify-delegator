<script lang="ts">
	import { Html, Head, Body, Preview } from '@better-svelte-email/components';
	import type { Snippet } from 'svelte';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { brand } from './brand';

	/**
	 * The frame every mail is drawn in, in DMUN's corporate design: the navy header with the
	 * "MUNify DELEGATOR" wordmark and the conference, a primary rule, the white body with the
	 * heading, and the small print below. Tables and inline styles only, which is what mail
	 * clients render.
	 */
	interface Props {
		heading: string;
		/** Shown under the wordmark. */
		conferenceTitle?: string;
		/** The line inboxes show next to the subject. */
		preview?: string;
		children: Snippet;
		/** Small print under the body. */
		footer?: Snippet;
	}

	let { heading, conferenceTitle, preview, children, footer }: Props = $props();
</script>

<Html lang={getLocale()}>
	<Head>
		<title>{heading}</title>
		<link rel="stylesheet" href={brand.fontUrl} />
	</Head>
	<Body
		style="margin: 0; padding: 0; background-color: {brand.page}; font-family: {brand.font}; color: {brand.text};"
	>
		{#if preview}
			<Preview {preview} />
		{/if}
		<table
			role="presentation"
			width="100%"
			cellspacing="0"
			cellpadding="0"
			border="0"
			style="background-color: {brand.page};"
		>
			<tbody>
				<tr>
					<td align="center" style="padding: 32px 12px;">
						<table
							role="presentation"
							width="100%"
							cellspacing="0"
							cellpadding="0"
							border="0"
							style="max-width: 600px;"
						>
							<tbody>
								<tr>
									<td style="background-color: {brand.navy}; padding: 24px 32px;">
										<p
											style="margin: 0; font-size: 22px; line-height: 1.2; color: #ffffff; font-family: {brand.font};"
										>
											<span style="font-weight: 200;">MUNify</span>
											<span style="font-weight: 700;">DELEGATOR</span>
										</p>
										{#if conferenceTitle}
											<p
												style="margin: 6px 0 0; font-size: 13px; line-height: 1.4; color: {brand.rule}; letter-spacing: 0.5px; font-family: {brand.font};"
											>
												{conferenceTitle}
											</p>
										{/if}
									</td>
								</tr>
								<tr>
									<td
										style="background-color: {brand.primary}; height: 4px; line-height: 4px; font-size: 0;"
										>&nbsp;</td
									>
								</tr>
								<tr>
									<td style="background-color: #ffffff; padding: 32px;">
										<h1
											style="margin: 0 0 24px; font-size: 26px; line-height: 1.25; font-weight: 700; color: {brand.navy}; font-family: {brand.font};"
										>
											{heading}
										</h1>
										{@render children()}
									</td>
								</tr>
								<tr>
									<td style="padding: 20px 32px; font-family: {brand.font};">
										{@render footer?.()}
										<p
											style="margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: {brand.muted};"
										>
											Deutsche Model United Nations (DMUN) e.V.
										</p>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
			</tbody>
		</table>
	</Body>
</Html>
