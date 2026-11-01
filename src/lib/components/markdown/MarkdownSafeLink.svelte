<script lang="ts">
	import type { Snippet } from 'svelte';
	import { safeLinkUrl } from '#lib/helpers/safeUrl';

	/** A link only to a web page, a mail address or a phone number; anything else is plain text. */
	let { token, children }: { token: { href: string; title?: string | null }; children?: Snippet } =
		$props();

	const href = $derived(safeLinkUrl(token.href));
</script>

{#if href}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a URL the markdown names, checked by safeLinkUrl -->
	<a {href} title={token.title ?? undefined} rel="noopener noreferrer">{@render children?.()}</a>
{:else}
	{@render children?.()}
{/if}
