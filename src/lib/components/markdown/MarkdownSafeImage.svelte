<script lang="ts">
	import { safeImageUrl } from '#lib/helpers/safeUrl';

	/** An image only from a web address; anything else shows its alternative text. */
	let { token }: { token: { href: string; title?: string | null; text: string } } = $props();

	const src = $derived(safeImageUrl(token.href));
</script>

{#if src}
	<img {src} title={token.title ?? undefined} alt={token.text} class="max-w-full" />
{:else}
	{token.text}
{/if}
