<script lang="ts">
	import type { Snippet } from 'svelte';
	import { qr } from '@svelte-put/qr/svg';
	import { qrStyle } from '#lib/helpers/qrStyle';

	interface Props {
		/** What the code holds; while null, `fallback` shows in its place. */
		data: string | null;
		/** The conference emblem, drawn in the middle. */
		logoUrl?: string;
		/** Names the code for screen readers; without one it counts as decoration. */
		label?: string;
		fallback?: Snippet;
	}

	let { data, logoUrl, label, fallback }: Props = $props();
</script>

<!-- always dark on white, whatever the theme: a scanner needs the contrast -->
<div class="flex aspect-square w-full items-center justify-center rounded-field bg-white p-2">
	{#if data}
		<svg
			use:qr={{ ...qrStyle(logoUrl), data }}
			class="w-full"
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : 'true'}
		></svg>
	{:else}
		{@render fallback?.()}
	{/if}
</div>
