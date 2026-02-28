<script lang="ts">
	import {
		cache,
		graphql,
		type MediaConsentStatus$options,
		type UpdateConferenceParticipantStatusInput
	} from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import StatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { queryParameters } from 'sveltekit-search-params';
	import BarcodeScanner from '$lib/components/Scanner/BarcodeScanner.svelte';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';

	let { data }: { data: PageData } = $props();

	let params = queryParameters({ queryUserId: true });
	let hotkeyDebounce = $state(false);

	let pageQuery = $derived(data.PostalRegistrationPageQuery);

	// Drawer state
	let showUserDrawer = $state(false);
	let lastLoadedUserId = $state('');

	// Scanner ref
	let scannerRef: BarcodeScanner;

	// --- Data queries ---

	const userData = graphql(`
		query GetUserDataForPostalRegistration($userId: String!, $conferenceId: String!) {
			findUniqueUser(where: { id: $userId }) {
				id
				given_name
				family_name
				birthday
			}
			findUniqueConferenceParticipantStatus(
				where: { userId_conferenceId: { conferenceId: $conferenceId, userId: $userId } }
			) {
				id
				termsAndConditions
				guardianConsent
				mediaConsent
				mediaConsentStatus
				assignedDocumentNumber
			}
		}
	`);

	// --- Effects ---

	// Fetch user data when scanned code changes
	$effect(() => {
		if ($params.queryUserId) {
			userData.fetch({
				variables: {
					userId: $params.queryUserId,
					conferenceId: data.conferenceId
				}
			});
		}
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
		if (queryId && $userData?.data?.findUniqueUser && !$userData.fetching) {
			lastLoadedUserId = queryId;
			showUserDrawer = true;
		}
	});

	// --- Actions ---

	const changeAdministrativeStatus = async (
		statusId: string | undefined,
		userId: string | undefined,
		mutationData: UpdateConferenceParticipantStatusInput
	) => {
		if (!userId) {
			toast.error(m.userNotFound());
			return;
		}
		const promise = changeParticipantStatus.mutate({
			where: { id: statusId, conferenceId: data.conferenceId, userId },
			data: mutationData
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		cache.markStale();
		await invalidateAll();
		userData.fetch();
	};

	const confirmAllStatuses = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			const userDetails = $userData?.data?.findUniqueUser;
			const postalRegistrationDetails = $userData?.data?.findUniqueConferenceParticipantStatus;

			if (!userDetails || !postalRegistrationDetails) {
				toast.error(m.userNotFound());
				return;
			}

			await changeAdministrativeStatus(postalRegistrationDetails.id, userDetails.id, {
				termsAndConditions: 'DONE',
				mediaConsent: 'DONE',
				guardianConsent: !ofAgeAtConference(
					$pageQuery.data?.findUniqueConference?.startConference,
					userDetails?.birthday
				)
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
			if ($params.queryUserId && $userData?.data?.findUniqueUser && !hotkeyDebounce) {
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
	{#if $params.queryUserId && $userData.fetching}
		<div class="flex items-center justify-center py-4">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if $params.queryUserId && !$userData?.data?.findUniqueUser && !$userData.fetching}
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
		<a
			class="btn btn-soft btn-sm"
			href={`/management/${data.conferenceId}/participants?selected=${$params.queryUserId}`}
			aria-label={m.details()}
		>
			<i class="fa-duotone fa-up-right-from-square"></i>
		</a>
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square"
			onclick={() => resetView()}
			aria-label={m.close()}
		>
			<i class="fa-duotone fa-xmark text-lg"></i>
		</button>
	{/snippet}

	{#if $userData?.data?.findUniqueUser && $userData.data.findUniqueUser.id === $params.queryUserId}
		{@const userDetails = $userData.data.findUniqueUser}
		{@const postalRegistrationDetails = $userData.data.findUniqueConferenceParticipantStatus}

		<!-- User info -->
		<div class="mb-4 flex items-center gap-4">
			<i class="fa-duotone fa-user text-2xl"></i>
			<div class="grow">
				<h3 class="text-xl font-bold">
					{formatNames(userDetails.given_name, userDetails.family_name)}
				</h3>
				<p class="text-sm opacity-60">
					{userDetails.birthday ? userDetails.birthday.toLocaleDateString() : ''}
				</p>
			</div>
		</div>

		<!-- Status widgets grid -->
		<div class="grid grid-flow-col grid-cols-1 grid-rows-5 gap-4 md:grid-cols-2 md:grid-rows-3">
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={postalRegistrationDetails?.assignedDocumentNumber}
				onSave={async (number?: number) =>
					await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails.id, {
						assignedDocumentNumber: number,
						assignNextDocumentNumber: !number
					})}
			/>
			<StatusWidget
				title={m.userAgreement()}
				faIcon="fa-file-signature"
				status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativeStatus) =>
					await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails.id, {
						termsAndConditions: newStatus
					})}
			/>
			{#if !ofAgeAtConference($pageQuery.data?.findUniqueConference?.startConference, userDetails.birthday)}
				<StatusWidget
					title={m.guardianAgreement()}
					faIcon="fa-user-shield"
					status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
					changeStatus={async (newStatus: AdministrativeStatus) =>
						await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails.id, {
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
				changeStatus={async (newStatus: AdministrativeStatus) =>
					await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails.id, {
						mediaConsent: newStatus
					})}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={postalRegistrationDetails?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaConsentStatus$options) =>
					await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails.id, {
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
