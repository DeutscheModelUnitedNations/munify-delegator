<script lang="ts">
	import { cache, graphql, type UpdateConferenceParticipantStatusInput } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import BarcodeScanner from '$lib/components/Scanner/BarcodeScanner.svelte';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';

	let { data }: { data: PageData } = $props();

	let params = queryParameters({ queryUserId: true });
	let hotkeyDebounce = $state(false);

	// Session state
	let occasion = persisted('accessFlowOccasion', '');

	// Access card input state
	let accessCardInput = $state('');
	let accessCardInputElem = $state<HTMLInputElement>();

	// Identity editing state
	let editingGivenName = $state(false);
	let editingFamilyName = $state(false);
	let editingBirthday = $state(false);
	let localGivenName = $state('');
	let localFamilyName = $state('');
	let localBirthday = $state('');

	// Drawer state
	let showUserDrawer = $state(false);

	// Scanner ref
	let scannerRef: BarcodeScanner;

	// --- Data queries ---

	const userData = graphql(`
		query GetUserDataForAccessFlow($userId: String!, $conferenceId: String!) {
			findUniqueUser(where: { id: $userId }) {
				id
				given_name
				family_name
				birthday
			}
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				delegation {
					id
					assignedNation {
						alpha2Code
						alpha3Code
					}
					assignedNonStateActor {
						name
						fontAwesomeIcon
					}
				}
				assignedCommittee {
					abbreviation
				}
			}
			findManyConferenceSupervisors(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				assignedRole {
					name
				}
			}
			findUniqueConferenceParticipantStatus(
				where: { userId_conferenceId: { conferenceId: $conferenceId, userId: $userId } }
			) {
				id
				accessCardId
			}
		}
	`);

	const createAttendanceEntryMutation = graphql(`
		mutation createAttendanceEntryForAccessFlow(
			$userId: String!
			$conferenceId: String!
			$occasion: String!
		) {
			createOneAttendanceEntry(userId: $userId, conferenceId: $conferenceId, occasion: $occasion) {
				id
			}
		}
	`);

	const updateIdentityMutation = graphql(`
		mutation updateUsersIdentityInfoForAccessFlow(
			$where: UserWhereUniqueInput!
			$givenName: String
			$familyName: String
			$birthday: DateTime
		) {
			updateOneUsersIdentityInfo(
				where: $where
				givenName: $givenName
				familyName: $familyName
				birthday: $birthday
			) {
				id
				given_name
				family_name
				birthday
			}
		}
	`);

	// --- Derived values for role display ---

	let delegationMember = $derived($userData?.data?.findManyDelegationMembers?.[0] ?? null);
	let singleParticipant = $derived($userData?.data?.findManySingleParticipants?.[0] ?? null);
	let isSupervisor = $derived(($userData?.data?.findManyConferenceSupervisors?.length ?? 0) > 0);

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
	let lastLoadedUserId = $state('');
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

	// Pre-fill access card input when user data loads
	$effect(() => {
		const status = $userData?.data?.findUniqueConferenceParticipantStatus;
		if (status?.accessCardId) {
			accessCardInput = status.accessCardId;
		} else {
			accessCardInput = '';
		}
	});

	// Initialize identity editing local values when user data loads
	$effect(() => {
		const user = $userData?.data?.findUniqueUser;
		if (user) {
			localGivenName = user.given_name ?? '';
			localFamilyName = user.family_name ?? '';
			localBirthday = user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '';
		}
	});

	// Auto-focus access card input when drawer opens
	$effect(() => {
		if (showUserDrawer && accessCardInputElem) {
			setTimeout(() => accessCardInputElem?.focus(), 200);
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
	};

	const saveAndNext = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			const userDetails = $userData?.data?.findUniqueUser;
			const statusDetails = $userData?.data?.findUniqueConferenceParticipantStatus;

			if (!userDetails) {
				toast.error(m.userNotFound());
				return;
			}

			let didPerformAction = false;

			// Save access card ID
			if (accessCardInput.trim()) {
				await changeAdministrativeStatus(statusDetails?.id, userDetails.id, {
					accessCardId: accessCardInput.trim()
				});
				didPerformAction = true;
			}

			// Create attendance entry if occasion is set
			if ($occasion.trim()) {
				await createAttendanceEntryMutation.mutate({
					userId: userDetails.id,
					conferenceId: data.conferenceId,
					occasion: $occasion.trim()
				});
				didPerformAction = true;
			}

			if (didPerformAction) {
				toast.success(m.accessFlowSaved());
			}

			// Close drawer and reset for next participant
			showUserDrawer = false;
			$params.queryUserId = '';
			accessCardInput = '';
			editingGivenName = false;
			editingFamilyName = false;
			editingBirthday = false;

			scannerRef?.reset();
		} finally {
			hotkeyDebounce = false;
		}
	};

	const saveIdentityField = async (
		field: 'givenName' | 'familyName' | 'birthday',
		value: string
	) => {
		const userDetails = $userData?.data?.findUniqueUser;
		if (!userDetails) return;

		const promise = updateIdentityMutation.mutate({
			where: { id: userDetails.id },
			givenName: field === 'givenName' ? value : undefined,
			familyName: field === 'familyName' ? value : undefined,
			birthday: field === 'birthday' ? new Date(value) : undefined
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;

		cache.markStale();
		userData.fetch({
			variables: {
				userId: userDetails.id,
				conferenceId: data.conferenceId
			}
		});

		if (field === 'givenName') editingGivenName = false;
		else if (field === 'familyName') editingFamilyName = false;
		else if (field === 'birthday') editingBirthday = false;
	};

	const resetView = () => {
		showUserDrawer = false;
		$params.queryUserId = '';
		accessCardInput = '';
		editingGivenName = false;
		editingFamilyName = false;
		editingBirthday = false;
		scannerRef?.reset();
	};

	// --- Hotkeys ---

	onMount(() => {
		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+a', () => {
			if ($params.queryUserId && $userData?.data?.findUniqueUser && !hotkeyDebounce) {
				saveAndNext();
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
		<h2 class="text-2xl font-bold">{m.accessFlow()}</h2>
		<p>{m.accessFlowDescription()}</p>

		<!-- Session-wide occasion input -->
		<FormFieldset title={m.occasionForSession()}>
			<input class="input w-full" type="text" bind:value={$occasion} placeholder={m.occasion()} />
		</FormFieldset>

		<BarcodeScanner
			bind:this={scannerRef}
			bind:scannedCode={$params.queryUserId}
			barcodeFormats={['data_matrix', 'code_128']}
			persistKey="useCameraForAccessFlow"
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
			<i class="fa-solid fa-triangle-exclamation text-lg"></i>
			<div>{m.userNotFoundForAccessFlow()}</div>
		</div>
	{/if}
</div>

<!-- Top drawer overlay for user data -->
<TopDrawer bind:open={showUserDrawer} title={m.identityCheck()} titleIcon="fa-id-badge">
	{#snippet headerActions()}
		<a
			class="btn btn-soft btn-sm"
			href={`/management/${data.conferenceId}/participants?selected=${$params.queryUserId}`}
			aria-label="View participant details"
		>
			<i class="fa-duotone fa-up-right-from-square"></i>
		</a>
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square"
			onclick={() => resetView()}
			aria-label="Close"
		>
			<i class="fa-solid fa-xmark text-lg"></i>
		</button>
	{/snippet}

	{#if $userData?.data?.findUniqueUser && $userData.data.findUniqueUser.id === $params.queryUserId}
		{@const userDetails = $userData.data.findUniqueUser}

		<!-- Identity section: Flag + Name + Birthday + Badges -->
		<div class="flex items-start gap-4">
			<!-- Flag -->
			{#if delegationMember?.delegation?.assignedNation}
				<Flag alpha2Code={delegationMember.delegation.assignedNation.alpha2Code} size="sm" />
			{:else if delegationMember?.delegation?.assignedNonStateActor}
				<Flag
					nsa
					icon={delegationMember.delegation.assignedNonStateActor.fontAwesomeIcon}
					size="sm"
				/>
			{/if}

			<div class="flex flex-1 flex-col gap-2">
				<!-- Name display (large, editable) -->
				<div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
					<!-- Given name -->
					<div class="flex-1">
						{#if editingGivenName}
							<div class="join w-full">
								<input
									class="input join-item input-lg w-full"
									bind:value={localGivenName}
									type="text"
									onkeydown={(e) => {
										if (e.key === 'Enter') saveIdentityField('givenName', localGivenName);
										if (e.key === 'Escape') editingGivenName = false;
									}}
								/>
								<button
									class="btn btn-square btn-lg join-item"
									onclick={() => saveIdentityField('givenName', localGivenName)}
									aria-label="Save"
								>
									<i class="fa-solid fa-save"></i>
								</button>
								<button
									class="btn btn-square btn-lg btn-error join-item"
									onclick={() => (editingGivenName = false)}
									aria-label="Cancel"
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						{:else}
							<button
								class="btn btn-soft group h-auto w-full justify-start py-2 text-left"
								onclick={() => (editingGivenName = true)}
							>
								<span class="text-3xl font-bold">{userDetails.given_name}</span>
								<i
									class="fa-duotone fa-pen-to-square ml-2 text-sm opacity-0 transition-opacity group-hover:opacity-50"
								></i>
							</button>
						{/if}
					</div>

					<!-- Family name -->
					<div class="flex-1">
						{#if editingFamilyName}
							<div class="join w-full">
								<input
									class="input join-item input-lg w-full"
									bind:value={localFamilyName}
									type="text"
									onkeydown={(e) => {
										if (e.key === 'Enter') saveIdentityField('familyName', localFamilyName);
										if (e.key === 'Escape') editingFamilyName = false;
									}}
								/>
								<button
									class="btn btn-square btn-lg join-item"
									onclick={() => saveIdentityField('familyName', localFamilyName)}
									aria-label="Save"
								>
									<i class="fa-solid fa-save"></i>
								</button>
								<button
									class="btn btn-square btn-lg btn-error join-item"
									onclick={() => (editingFamilyName = false)}
									aria-label="Cancel"
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						{:else}
							<button
								class="btn btn-soft group h-auto w-full justify-start py-2 text-left"
								onclick={() => (editingFamilyName = true)}
							>
								<span class="text-3xl font-bold">{userDetails.family_name}</span>
								<i
									class="fa-duotone fa-pen-to-square ml-2 text-sm opacity-0 transition-opacity group-hover:opacity-50"
								></i>
							</button>
						{/if}
					</div>
				</div>

				<!-- Birthday display (large, editable) -->
				<div>
					{#if editingBirthday}
						<div class="join">
							<input
								class="input join-item input-lg"
								bind:value={localBirthday}
								type="date"
								onkeydown={(e) => {
									if (e.key === 'Enter') saveIdentityField('birthday', localBirthday);
									if (e.key === 'Escape') editingBirthday = false;
								}}
							/>
							<button
								class="btn btn-square btn-lg join-item"
								onclick={() => saveIdentityField('birthday', localBirthday)}
								aria-label="Save"
							>
								<i class="fa-solid fa-save"></i>
							</button>
							<button
								class="btn btn-square btn-lg btn-error join-item"
								onclick={() => (editingBirthday = false)}
								aria-label="Cancel"
							>
								<i class="fa-solid fa-xmark"></i>
							</button>
						</div>
					{:else}
						<button
							class="btn btn-soft group h-auto justify-start py-2 text-left"
							onclick={() => (editingBirthday = true)}
						>
							<i class="fa-duotone fa-cake-candles text-xl"></i>
							<span class="text-xl">
								{userDetails.birthday
									? new Date(userDetails.birthday).toLocaleDateString('de', {
											dateStyle: 'long'
										})
									: '—'}
							</span>
							<i
								class="fa-duotone fa-pen-to-square ml-2 text-sm opacity-0 transition-opacity group-hover:opacity-50"
							></i>
						</button>
					{/if}
				</div>

				<!-- Role / Committee / Nation badges -->
				<div class="mt-1 flex flex-wrap gap-2">
					{#if delegationMember?.assignedCommittee}
						<span class="badge badge-soft badge-primary">
							{delegationMember.assignedCommittee.abbreviation}
						</span>
					{/if}
					{#if delegationMember?.delegation?.assignedNation}
						<span class="badge badge-soft badge-secondary">
							{getFullTranslatedCountryNameFromISO3Code(
								delegationMember.delegation.assignedNation.alpha3Code
							)}
						</span>
					{/if}
					{#if delegationMember?.delegation?.assignedNonStateActor}
						<span class="badge badge-soft badge-secondary">
							{delegationMember.delegation.assignedNonStateActor.name}
						</span>
					{/if}
					{#if singleParticipant?.assignedRole}
						<span class="badge badge-soft badge-accent">
							{singleParticipant.assignedRole.name}
						</span>
					{/if}
					{#if isSupervisor}
						<span class="badge badge-soft badge-warning">
							{m.supervisor()}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Access Card ID Section -->
		<div class="mt-6 flex flex-col gap-2">
			<h3 class="flex items-center gap-2 text-lg font-bold">
				<i class="fa-duotone fa-id-card text-xl"></i>
				{m.accessCardId()}
			</h3>
			<input
				class="input input-lg w-full"
				bind:this={accessCardInputElem}
				bind:value={accessCardInput}
				type="text"
				placeholder={m.accessCardId()}
				onkeydown={(e) => {
					if (e.key === 'Enter') saveAndNext();
				}}
			/>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn btn-primary flex-1" onclick={saveAndNext} disabled={hotkeyDebounce}>
			<i class="fa-solid fa-check"></i>
			{m.saveAndNext()}
			<Kbd hotkey="alt+a" />
		</button>
		<button class="btn btn-error" onclick={resetView}>
			<i class="fa-solid fa-xmark"></i>
			{m.close()}
			<Kbd hotkey="Esc" />
		</button>
	{/snippet}
</TopDrawer>
