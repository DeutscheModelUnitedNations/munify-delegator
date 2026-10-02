<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchMyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import DataMatrixDisplay from '$lib/components/registrationMode/DataMatrixDisplay.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';
	import { onMount, onDestroy } from 'svelte';
	import { describeParticipant } from './participantInfo';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = $derived(await getCurrentUser());

	const participation = $derived(
		await fetchMyConferenceParticipation({
			userId: currentUser.sub,
			conferenceId: params.conferenceId
		})
	);
	let conference = $derived(participation?.conference);

	// User identity from OIDC
	let fullName = $derived(`${currentUser.given_name} ${currentUser.family_name}`);
	let userId = $derived(currentUser.sub);

	// Live timestamp
	let currentTime = $state(new Date());
	let timeInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Scroll down to hide the navbar
		window.scrollTo({ top: 120, behavior: 'instant' });

		timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (timeInterval) {
			clearInterval(timeInterval);
		}
	});

	let participantInfo = $derived(describeParticipant(participation));

	let isValidParticipant = $derived(
		participantInfo.type !== 'unassigned' && participantInfo.type !== 'none'
	);

	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{m.registrationMode()} - {conference?.title ?? ''}</title>
</svelte:head>

<div class="bg-base-100 flex min-h-screen w-full flex-col items-center p-4 sm:p-6">
	<!-- Header: Conference + Timestamp -->
	<div class="flex w-full items-start justify-between">
		<div class="text-base-content/60 text-sm">
			{conference?.title ?? ''}
		</div>
		<div class="bg-base-200 rounded-lg px-3 py-1 font-mono text-lg tabular-nums">
			{formatTime(currentTime)}
		</div>
	</div>

	{#if isValidParticipant}
		<!-- Main content area -->
		<div class="flex flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
			<!-- Flag - Most Prominent -->
			<div class="flex flex-col items-center gap-2">
				<div class="flag-glow rounded-xl">
					{#if participantInfo.alpha2Code}
						<Flag size="lg" alpha2Code={participantInfo.alpha2Code} />
					{:else if participantInfo.isNSA}
						<Flag size="lg" nsa icon={participantInfo.nsaIcon} />
					{/if}
				</div>
			</div>

			<!-- Role Name -->
			<span style="font-size: clamp(1.5rem, 6vw, 3rem);" class="text-center font-semibold">
				{participantInfo.roleDisplay}{#if participantInfo.committeeAbbreviation}
					<span class="text-base-content/70 ml-2">({participantInfo.committeeAbbreviation})</span>
				{/if}
			</span>

			<!-- Full Name -->
			<h1 class="mt-2 text-center font-bold" style="font-size: clamp(1.75rem, 8vw, 4rem);">
				{fullName}
			</h1>

			<!-- DataMatrix Barcode - Smaller -->
			<div class="mt-2 w-full max-w-[10rem]">
				<DataMatrixDisplay data={userId} />
			</div>

			<!-- User ID -->
			<div class="text-base-content/40 font-mono" style="font-size: clamp(0.7rem, 2.5vw, 0.9rem);">
				{userId}
			</div>
		</div>
	{:else}
		<!-- Error state for unassigned/no participant -->
		<div class="flex flex-1 flex-col items-center justify-center gap-6">
			<div class="text-error text-6xl">
				<i class="fa-solid fa-circle-exclamation"></i>
			</div>
			<h1 class="text-center text-2xl font-bold">
				{m.registrationModeNotRegistered()}
			</h1>
			<p class="text-base-content/70 max-w-md text-center">
				{m.registrationModeNotRegisteredDescription()}
			</p>
		</div>
	{/if}

	<!-- Back Button -->
	<div class="mt-auto w-full pt-4">
		<a href={resolve(`/dashboard/${params.conferenceId}`)} class="btn btn-ghost btn-sm gap-2">
			<i class="fa-solid fa-arrow-left"></i>
			{m.backToDashboard()}
		</a>
	</div>
</div>

<style>
	.flag-glow {
		box-shadow:
			0 0 30px rgba(var(--color-primary-rgb, 59, 130, 246), 0.5),
			0 0 60px rgba(var(--color-primary-rgb, 59, 130, 246), 0.3),
			0 10px 40px rgba(0, 0, 0, 0.2);
	}
</style>
