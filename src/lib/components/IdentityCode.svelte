<script lang="ts">
	import QrCode from './QrCode.svelte';
	import { onMount } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { signedCodeLink } from '#lib/signedCode/signedCode';

	interface Props {
		/** The conference the code is for, whose emblem sits in the middle of it. */
		conferenceId: string;
		/** No glow around the code, for a ticket that has been used. */
		calm?: boolean;
	}

	let { conferenceId, calm = false }: Props = $props();

	// The code is signed and only counts for a few minutes, so it is renewed while the page is open
	// and again when the page comes back to the front. The QR code holds it as a link, which the
	// team's phones open with the camera app and the scanners read the code from.
	const RENEW_EVERY_MS = 2 * 60 * 1000;

	let code = $state<string | null>(null);
	let failed = $state(false);

	async function renew() {
		try {
			const issued = await client.mutate.issueNametagCode({ __args: { conferenceId }, code: true });
			code = signedCodeLink({ origin: location.origin, code: issued.code });
			failed = false;
		} catch {
			// Offline: the code on screen keeps showing until it is too old to count
			failed = code === null;
		}
	}

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, emblemFile: { url: true } })
	);
	const emblemUrl = $derived(conference.emblemFile?.url);

	onMount(() => {
		void renew();
		const timer = setInterval(renew, RENEW_EVERY_MS);
		const onVisible = () => {
			if (document.visibilityState === 'visible') void renew();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<div class="{calm ? '' : 'animate-registration-pulse'} rounded-box p-1">
	<div class="{calm ? 'bg-base-300' : 'animate-registration-border'} rounded-box p-1">
		<QrCode data={code} logoUrl={emblemUrl ?? undefined}>
			{#snippet fallback()}
				{#if failed}
					<i aria-hidden="true" class="ph-duotone ph-warning text-error text-4xl"></i>
				{:else}
					<span class="loading loading-spinner text-primary"></span>
				{/if}
			{/snippet}
		</QrCode>
	</div>
</div>
