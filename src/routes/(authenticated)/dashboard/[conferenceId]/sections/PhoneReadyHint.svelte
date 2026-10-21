<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import type { ConferenceState } from '#lib/data/dashboardLinks.js';

	/**
	 * At the conference, participants show their digital nametag and check-in code on their phone.
	 * Before it, this asks them to get the phone ready - signed in, on the home screen; during it,
	 * a one-line reminder. Dismissed per conference in this browser.
	 */
	interface Props {
		conferenceId: string;
		conferenceState: ConferenceState;
	}

	let { conferenceId, conferenceState }: Props = $props();

	const storageKey = $derived(`phone-ready-hint-dismissed-${conferenceId}`);

	function readDismissed(key: string) {
		try {
			return localStorage.getItem(key) === '1';
		} catch {
			return false;
		}
	}

	let dismissedNow = $state(false);
	const dismissed = $derived(dismissedNow || readDismissed(storageKey));

	function dismiss() {
		dismissedNow = true;
		try {
			localStorage.setItem(storageKey, '1');
		} catch {
			// private mode: dismissed until the page is left
		}
	}

	const nametagHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/registration-mode', { conferenceId })
	);
</script>

{#if conferenceState === 'PREPARATION' && !dismissed}
	<DashboardSection
		icon="mobile-screen"
		title={m.phoneReadyTitle()}
		description={m.phoneReadyDescription()}
		variant="info"
	>
		<ul class="flex flex-col gap-2">
			<li class="flex gap-3">
				<i class="fa-sharp-duotone fa-solid fa-right-to-bracket text-info mt-1 w-5 shrink-0"></i>
				<span>{m.phoneReadyLogin()}</span>
			</li>
			<li class="flex gap-3">
				<i class="fa-sharp-duotone fa-solid fa-house-chimney text-info mt-1 w-5 shrink-0"></i>
				<span>{m.phoneReadyHomeScreen()}</span>
			</li>
			<li class="flex gap-3">
				<i class="fa-sharp-duotone fa-solid fa-id-badge text-info mt-1 w-5 shrink-0"></i>
				<span>{m.phoneReadyNametag()}</span>
			</li>
			<li class="flex gap-3">
				<i class="fa-sharp-duotone fa-solid fa-battery-full text-info mt-1 w-5 shrink-0"></i>
				<span>{m.phoneReadyBattery()}</span>
			</li>
		</ul>
		<div class="mt-4 flex flex-wrap gap-2">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above -->
			<a class="btn btn-info btn-sm" href={nametagHref}>
				<i class="fa-sharp-duotone fa-solid fa-id-badge"></i>
				{m.phoneReadyOpenNametag()}
			</a>
			<button class="btn btn-ghost btn-sm" onclick={dismiss}>{m.phoneReadyDismiss()}</button>
		</div>
	</DashboardSection>
{:else if conferenceState === 'ACTIVE'}
	<div class="alert alert-info">
		<i class="fa-sharp-duotone fa-solid fa-mobile-screen text-xl"></i>
		<span>{m.phoneReadyActiveReminder()}</span>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above -->
		<a class="btn btn-sm" href={nametagHref}>{m.phoneReadyOpenNametag()}</a>
	</div>
{/if}
