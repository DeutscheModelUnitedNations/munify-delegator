<script lang="ts">
	import type { PageData } from './$types';
	import DataMatrixDisplay from '$lib/components/RegistrationMode/DataMatrixDisplay.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import { m } from '$lib/paraglide/messages';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	let conferenceQueryData = $derived(data.conferenceQueryData);
	let conference = $derived(conferenceQueryData?.findUniqueConference);
	let delegationMember = $derived(conferenceQueryData?.findUniqueDelegationMember);
	let singleParticipant = $derived(conferenceQueryData?.findUniqueSingleParticipant);
	let supervisor = $derived(conferenceQueryData?.findUniqueConferenceSupervisor);
	let teamMember = $derived(conferenceQueryData?.findUniqueTeamMember);

	// User identity from OIDC
	let fullName = $derived(`${data.user.given_name} ${data.user.family_name}`);
	let userId = $derived(data.user.sub);

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

	// Determine participant type and role info
	type ParticipantInfo = {
		type: 'delegation' | 'single' | 'team' | 'supervisor' | 'unassigned' | 'none';
		roleDisplay: string;
		committeeAbbreviation?: string;
		alpha2Code?: string;
		isNSA?: boolean;
		nsaIcon?: string | null;
	};

	let participantInfo = $derived.by((): ParticipantInfo => {
		// Delegation Member with assigned nation
		if (delegationMember?.delegation?.assignedNation) {
			const nation = delegationMember.delegation.assignedNation;
			const committee = delegationMember.assignedCommittee;
			return {
				type: 'delegation',
				roleDisplay: getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code),
				committeeAbbreviation: committee?.abbreviation,
				alpha2Code: nation.alpha2Code.toLowerCase()
			};
		}

		// Delegation Member with assigned NSA
		if (delegationMember?.delegation?.assignedNonStateActor) {
			const nsa = delegationMember.delegation.assignedNonStateActor;
			return {
				type: 'delegation',
				roleDisplay: nsa.name,
				isNSA: true,
				nsaIcon: nsa.fontAwesomeIcon
			};
		}

		// Delegation Member without assignment
		if (delegationMember) {
			return { type: 'unassigned', roleDisplay: '' };
		}

		// Single Participant with assigned role
		if (singleParticipant?.assignedRole) {
			const role = singleParticipant.assignedRole;
			return {
				type: 'single',
				roleDisplay: role.name,
				isNSA: true,
				nsaIcon: role.fontAwesomeIcon
			};
		}

		// Single Participant without assignment
		if (singleParticipant) {
			return { type: 'unassigned', roleDisplay: '' };
		}

		// Team Member (always valid)
		if (teamMember) {
			return {
				type: 'team',
				roleDisplay: translateTeamRole(teamMember.role),
				isNSA: true,
				nsaIcon: 'users-gear'
			};
		}

		// Supervisor (always valid)
		if (supervisor) {
			return {
				type: 'supervisor',
				roleDisplay: m.supervisor(),
				isNSA: true,
				nsaIcon: 'chalkboard-user'
			};
		}

		return { type: 'none', roleDisplay: '' };
	});

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
		<a href="/dashboard/{conference?.id}" class="btn btn-ghost btn-sm gap-2">
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
