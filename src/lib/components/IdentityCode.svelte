<script lang="ts">
	import { qr } from '@svelte-put/qr/svg';
	import { onMount } from 'svelte';
	import { client } from '$lib/api/rumbleClient/client';

	interface Props {
		/** Whose conference's emblem sits in the middle of the code. */
		conferenceId: string;
		/** No glow around the code, for a ticket that has been used. */
		calm?: boolean;
	}

	let { conferenceId, calm = false }: Props = $props();

	// The code is signed and only counts for a few minutes, so it is renewed while the page is open
	// and again when the page comes back to the front.
	const RENEW_EVERY_MS = 2 * 60 * 1000;

	let code = $state<string | null>(null);
	let failed = $state(false);

	async function renew() {
		try {
			code = (await client.mutate.issueIdentityCode({ code: true })).code;
			failed = false;
		} catch {
			// Offline: the code on screen keeps showing until it is too old to count
			failed = code === null;
		}
	}

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, emblemUrl: true })
	);

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
		<!-- always dark on white, whatever the theme: a scanner needs the contrast -->
		<div class="flex aspect-square w-full items-center justify-center rounded-field bg-white p-2">
			{#if code}
				<svg
					use:qr={{
						data: code,
						shape: 'circle',
						// a logo needs the highest correction; without one a lower level keeps the code coarser
						errorCorrectionLevel: conference.emblemUrl ? 'H' : 'M',
						moduleFill: '#01548F',
						anchorOuterFill: '#1B1837',
						anchorInnerFill: '#01548F',
						logo: conference.emblemUrl ?? undefined
					}}
					class="w-full"
				></svg>
			{:else if failed}
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error text-4xl"></i>
			{:else}
				<span class="loading loading-spinner text-primary"></span>
			{/if}
		</div>
	</div>
</div>
