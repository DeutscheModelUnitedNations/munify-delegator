<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client, type MediaconsentstatusEnum, type Mutation } from '$lib/api/rumbleClient/client';
	import type { PageData } from './$types';
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import formatNames from '$lib/helpers/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import StatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { queryParameters } from 'sveltekit-search-params';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	let { data }: { data: PageData } = $props();

	let params = queryParameters({ queryUserId: true });
	let hotkeyDebounce = $state(false);

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: data.conferenceId },
			id: true,
			startConference: true,
			nextDocumentNumber: true
		})
	);

	// Drawer state
	let showUserDrawer = $state(false);
	let lastLoadedUserId = $state('');

	// Scanner ref
	let scannerRef: BarcodeScanner;

	// --- Data queries ---

	/** The scanned person plus the postal paperwork we are here to tick off. */
	async function fetchUserData(userId: string) {
		const [user, statuses] = await Promise.all([
			client.query.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				birthday: true
			}),
			client.query.conferenceParticipantStatuses({
				__args: {
					where: { conferenceId: { eq: data.conferenceId }, userId: { eq: userId } }
				},
				id: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				mediaConsentStatus: true,
				assignedDocumentNumber: true
			})
		]);

		return { user, status: statuses.at(0) ?? null };
	}

	let userData = $state<Awaited<ReturnType<typeof fetchUserData>>>();
	let userDataLoading = $state(false);

	async function loadUserData(userId: string) {
		userDataLoading = true;
		try {
			userData = await fetchUserData(userId);
		} finally {
			userDataLoading = false;
		}
	}

	// --- Effects ---

	// Fetch user data when scanned code changes
	$effect(() => {
		const queryId = $params.queryUserId;
		if (queryId) void loadUserData(queryId);
	});

	// Drawer open/close management with stale data prevention
	$effect(() => {
		const queryId = $params.queryUserId;
		if (!queryId) {
			showUserDrawer = false;
			lastLoadedUserId = '';
			return;
		}
		if (queryId !== lastLoadedUserId) {
			showUserDrawer = false;
		}
	});
	$effect(() => {
		const queryId = $params.queryUserId;
		if (queryId && userData?.user?.id === queryId && !userDataLoading) {
			lastLoadedUserId = queryId;
			showUserDrawer = true;
		}
	});

	// --- Actions ---

	/** The mutation's own argument type minus the identifying fields this page fills in. */
	type StatusChange = Omit<
		Parameters<Mutation['updateConferenceParticipantStatus']>[0],
		'conferenceId' | 'id' | 'userId'
	>;

	const changeAdministrativestatusEnum = async (
		statusId: string | undefined,
		userId: string | undefined,
		change: StatusChange
	) => {
		if (!userId) {
			toast.error(m.userNotFound());
			return;
		}
		const promise = client.mutate.updateConferenceParticipantStatus({
			__args: { ...change, id: statusId, conferenceId: data.conferenceId, userId },
			id: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true,
			assignedDocumentNumber: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await loadUserData(userId);
	};

	const confirmAllStatuses = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			const userDetails = userData?.user;
			const postalRegistrationDetails = userData?.status;

			if (!userDetails || !postalRegistrationDetails) {
				toast.error(m.userNotFound());
				return;
			}

			await changeAdministrativestatusEnum(postalRegistrationDetails.id, userDetails.id, {
				termsAndConditions: 'DONE',
				mediaConsent: 'DONE',
				guardianConsent: !ofAgeAtConference(conference?.startConference, userDetails?.birthday)
					? 'DONE'
					: undefined,
				mediaConsentStatus: 'ALLOWED_ALL'
			});
		} finally {
			hotkeyDebounce = false;
		}
	};

	const resetView = () => {
		showUserDrawer = false;
		$params.queryUserId = '';
		scannerRef?.reset();
	};

	// --- Hotkeys ---

	onMount(() => {
		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+a', () => {
			if ($params.queryUserId && userData?.user && !hotkeyDebounce) {
				confirmAllStatuses();
			}
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+a');
	});
</script>

<div class="flex w-full flex-col gap-8 md:p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.postalRegistration()}</h2>
		<p>
			{m.scanPostalRegistrationCode()}
			<Kbd hotkey="alt+a" size="xs" />
			{m.scanPostalRegistrationCodeHotkeyConfirmAll()}
			<Kbd hotkey="alt+1" size="xs" />, <Kbd hotkey="alt+2" size="xs" />, <Kbd
				hotkey="alt+3"
				size="xs"
			/>
			{m.scanPostalRegistrationCodeHotkeyMedia()}
		</p>

		<BarcodeScanner
			bind:this={scannerRef}
			bind:scannedCode={$params.queryUserId}
			barcodeFormats={['data_matrix']}
			persistKey="useCameraForPostalRegistration"
			manualPlaceholder={m.enterPostalRegistrationCode()}
			scanPromptText={m.scanPostalRegistrationCodePrompt()}
			cameraZIndex="z-30"
		/>
	</div>

	<!-- Loading / error state -->
	{#if $params.queryUserId && userDataLoading}
		<div class="flex items-center justify-center py-4">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if $params.queryUserId && !userData?.user && !userDataLoading}
		<div class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation text-lg"></i>
			<div>{m.userNotFoundForPostalRegistration()}</div>
		</div>
	{/if}
</div>

<!-- Top drawer overlay for user data -->
<TopDrawer
	bind:open={showUserDrawer}
	title={m.postalRegistration()}
	titleIcon="fa-envelopes-bulk"
	maxWidth="max-w-4xl"
>
	{#snippet headerActions()}
		<button
			class="btn btn-soft btn-sm"
			onclick={() => {
				if ($params.queryUserId) openUserCard($params.queryUserId, data.conferenceId);
			}}
			aria-label={m.details()}
		>
			<i class="fa-duotone fa-id-card"></i>
		</button>
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square"
			onclick={() => resetView()}
			aria-label={m.close()}
		>
			<i class="fa-duotone fa-xmark text-lg"></i>
		</button>
	{/snippet}

	{#if userData?.user && userData.user.id === $params.queryUserId}
		{@const userDetails = userData.user}
		{@const postalRegistrationDetails = userData.status}

		<!-- User info -->
		<div class="mb-4 flex items-center gap-4">
			<i class="fa-duotone fa-user text-2xl"></i>
			<div class="grow">
				<h3 class="text-xl font-bold">
					{formatNames(userDetails.givenName ?? undefined, userDetails.familyName ?? undefined)}
				</h3>
				<p class="text-sm opacity-60">
					{userDetails.birthday ? userDetails.birthday.toLocaleDateString() : ''}
				</p>
			</div>
		</div>

		<!-- Status widgets grid -->
		<div class="grid grid-flow-col grid-cols-1 grid-rows-5 gap-4 md:grid-cols-2 md:grid-rows-3">
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={postalRegistrationDetails?.assignedDocumentNumber ?? undefined}
				onSave={async (number?: number) =>
					await changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, {
						assignedDocumentNumber: number,
						assignNextDocumentNumber: !number
					})}
			/>
			<StatusWidget
				title={m.userAgreement()}
				faIcon="fa-file-signature"
				status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, {
						termsAndConditions: newStatus
					})}
			/>
			{#if !ofAgeAtConference(conference?.startConference, userDetails.birthday)}
				<StatusWidget
					title={m.guardianAgreement()}
					faIcon="fa-user-shield"
					status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
					changeStatus={async (newStatus: AdministrativestatusEnum) =>
						await changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, {
							guardianConsent: newStatus
						})}
				/>
			{:else}
				<GuardianConsentNotNeeded />
			{/if}
			<StatusWidget
				title={m.mediaAgreement()}
				faIcon="fa-camera"
				status={postalRegistrationDetails?.mediaConsent ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, {
						mediaConsent: newStatus
					})}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={postalRegistrationDetails?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaconsentstatusEnum) =>
					await changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, {
						mediaConsentStatus: newStatus
					})}
				hotkeys={{ NOT_ALLOWED: 'alt+1', PARTIALLY_ALLOWED: 'alt+2', ALLOWED_ALL: 'alt+3' }}
			/>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn btn-primary flex-1" onclick={confirmAllStatuses} disabled={hotkeyDebounce}>
			<i class="fa-solid fa-check"></i>
			{m.confirmAll()}
			<Kbd hotkey="alt+a" />
		</button>
		<button class="btn btn-error" onclick={resetView}>
			<i class="fa-solid fa-xmark"></i>
			{m.close()}
			<Kbd hotkey="Esc" />
		</button>
	{/snippet}
</TopDrawer>
