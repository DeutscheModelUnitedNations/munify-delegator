<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client, type Mutation } from '$lib/api/rumbleClient/client';
	import type { PageData } from './$types';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

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

	/** Everything the scan drawer shows about the person behind a scanned code. */
	async function fetchUserData(userId: string) {
		const forUser = { conferenceId: { eq: data.conferenceId }, userId: { eq: userId } };

		const [user, delegationMembers, supervisors, singleParticipants, statuses] = await Promise.all([
			client.query.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				birthday: true
			}),
			client.query.delegationMembers({
				__args: { where: forUser },
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { name: true, fontAwesomeIcon: true }
				},
				assignedCommittee: { abbreviation: true }
			}),
			client.query.conferenceSupervisors({ __args: { where: forUser }, id: true }),
			client.query.singleParticipants({
				__args: { where: forUser },
				id: true,
				assignedRole: { name: true }
			}),
			client.query.conferenceParticipantStatuses({
				__args: { where: forUser },
				id: true,
				accessCardId: true
			})
		]);

		return {
			user,
			delegationMember: delegationMembers.at(0) ?? null,
			isSupervisor: supervisors.length > 0,
			singleParticipant: singleParticipants.at(0) ?? null,
			status: statuses.at(0) ?? null
		};
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

	// --- Derived values for role display ---

	let delegationMember = $derived(userData?.delegationMember ?? null);
	let singleParticipant = $derived(userData?.singleParticipant ?? null);
	let isSupervisor = $derived(userData?.isSupervisor ?? false);

	// --- Effects ---

	// Fetch user data when scanned code changes
	$effect(() => {
		const queryId = $params.queryUserId;
		if (queryId) void loadUserData(queryId);
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
		if (queryId && userData?.user && !userDataLoading) {
			lastLoadedUserId = queryId;
			showUserDrawer = true;
		}
	});

	// Pre-fill access card input when user data loads
	$effect(() => {
		const status = userData?.status;
		if (status?.accessCardId) {
			accessCardInput = status.accessCardId;
		} else {
			accessCardInput = '';
		}
	});

	// Initialize identity editing local values when user data loads
	$effect(() => {
		const user = userData?.user;
		if (user) {
			localGivenName = user.givenName ?? '';
			localFamilyName = user.familyName ?? '';
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

	/** The mutation's own argument type minus the identifying fields this page fills in. */
	type StatusChange = Omit<
		Parameters<Mutation['updateConferenceParticipantStatus']>[0],
		'conferenceId' | 'id' | 'userId'
	>;

	const changeAdministrativeStatus = async (
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
			accessCardId: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await loadUserData(userId);
	};

	const saveAndNext = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			const userDetails = userData?.user;
			const statusDetails = userData?.status;

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
				await client.mutate.createAttendanceEntry({
					__args: {
						userId: userDetails.id,
						conferenceId: data.conferenceId,
						occasion: $occasion.trim()
					},
					id: true
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
		const userDetails = userData?.user;
		if (!userDetails) return;

		const promise = client.mutate.updateUsersIdentityInfo({
			__args: {
				id: userDetails.id,
				givenName: field === 'givenName' ? value : undefined,
				familyName: field === 'familyName' ? value : undefined,
				birthday: field === 'birthday' ? new Date(value) : undefined
			},
			id: true,
			givenName: true,
			familyName: true,
			birthday: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;

		await loadUserData(userDetails.id);

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
			if ($params.queryUserId && userData?.user && !hotkeyDebounce) {
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
	{#if $params.queryUserId && userDataLoading}
		<div class="flex items-center justify-center py-4">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if $params.queryUserId && !userData?.user && !userDataLoading}
		<div class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation text-lg"></i>
			<div>{m.userNotFoundForAccessFlow()}</div>
		</div>
	{/if}
</div>

<!-- Top drawer overlay for user data -->
<TopDrawer bind:open={showUserDrawer} title={m.identityCheck()} titleIcon="fa-id-badge">
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
									aria-label={m.save()}
								>
									<i class="fa-solid fa-save"></i>
								</button>
								<button
									class="btn btn-square btn-lg btn-error join-item"
									onclick={() => (editingGivenName = false)}
									aria-label={m.cancel()}
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						{:else}
							<button
								class="btn btn-soft group h-auto w-full justify-start py-2 text-left"
								onclick={() => (editingGivenName = true)}
							>
								<span class="text-3xl font-bold">{userDetails.givenName}</span>
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
									aria-label={m.save()}
								>
									<i class="fa-solid fa-save"></i>
								</button>
								<button
									class="btn btn-square btn-lg btn-error join-item"
									onclick={() => (editingFamilyName = false)}
									aria-label={m.cancel()}
								>
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						{:else}
							<button
								class="btn btn-soft group h-auto w-full justify-start py-2 text-left"
								onclick={() => (editingFamilyName = true)}
							>
								<span class="text-3xl font-bold">{userDetails.familyName}</span>
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
								aria-label={m.save()}
							>
								<i class="fa-solid fa-save"></i>
							</button>
							<button
								class="btn btn-square btn-lg btn-error join-item"
								onclick={() => (editingBirthday = false)}
								aria-label={m.cancel()}
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
		<FormFieldset title={m.accessCardId()}>
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
		</FormFieldset>
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
