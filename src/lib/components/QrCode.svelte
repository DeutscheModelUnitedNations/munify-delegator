<script lang="ts">
	import type { Snippet } from 'svelte';
	import { qr } from '@svelte-put/qr/svg';
	import { client } from '#lib/api/rumbleClient/client';
	import { qrStyle } from '#lib/helpers/qrStyle';

	interface Props {
		/** What the code holds; while null, `fallback` shows in its place. */
		data: string | null;
		/** The conference whose design (`qrCorporateDesign`) the code takes. */
		conferenceId: string;
		/** Draws the conference emblem in the middle, in the corporate design. */
		emblem?: boolean;
		/** Names the code for screen readers; without one it counts as decoration. */
		label?: string;
		fallback?: Snippet;
	}

	let { data, conferenceId, emblem = false, label, fallback }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			qrCorporateDesign: true,
			emblemFile: { url: true }
		})
	);
	const corporate = $derived(conference.qrCorporateDesign);
	const emblemUrl = $derived(conference.emblemFile?.url);
	const style = $derived(
		qrStyle({ logoUrl: emblem && emblemUrl ? emblemUrl : undefined, corporate })
	);
</script>

<!-- always dark on white, whatever the theme: a scanner needs the contrast -->
<div class="flex aspect-square w-full items-center justify-center rounded-field bg-white p-2">
	{#if data}
		{#key style}
			<svg
				use:qr={{ ...style, data }}
				class="w-full"
				role={label ? 'img' : undefined}
				aria-label={label}
				aria-hidden={label ? undefined : 'true'}
			></svg>
		{/key}
	{:else}
		{@render fallback?.()}
	{/if}
</div>
