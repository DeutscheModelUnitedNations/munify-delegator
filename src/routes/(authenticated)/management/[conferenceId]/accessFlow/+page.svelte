<script lang="ts">
	import { cache, graphql, type UpdateConferenceParticipantStatusInput } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import { BarcodeDetector } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { Drawer } from 'vaul-svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	let { data }: { data: PageData } = $props();

	// Scanner state
	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let selectedVideoDeviceIndex = $state(0);
	let videoElem: HTMLVideoElement;
	let canvasElem: HTMLCanvasElement;
	let streaming = $state(false);
	let params = queryParameters({ queryUserId: true });
	let useCamera = persisted('useCameraForAccessFlow', false);
	let manualInputElem = $state<HTMLInputElement>();
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

	const barcodeDetector: BarcodeDetector = new BarcodeDetector({
		formats: ['data_matrix', 'code_128']
	});

	// --- Camera / Scanner functions (from postalRegistration) ---

	async function startVideo() {
		$params.queryUserId = '';
		if (!videoElem) {
			console.error('videoElem is not available.');
			return;
		}
		try {
			if (streaming) {
				stopVideo();
			}
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableVideoDevices = devices.filter((device) => device.kind === 'videoinput');
			if (selectedVideoDeviceIndex >= availableVideoDevices.length) {
				selectedVideoDeviceIndex = 0;
			}
			const constraints: MediaStreamConstraints = { video: {} };
			if (availableVideoDevices.length > 0) {
				(constraints.video as MediaTrackConstraints).deviceId = {
					ideal: availableVideoDevices[selectedVideoDeviceIndex].deviceId
				};
			}
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElem.srcObject = stream;
			await videoElem.play();
			streaming = true;
		} catch (error) {
			console.error('Error accessing camera:', error);
			let errorMessage = 'Failed to access camera.';
			if (error instanceof DOMException) {
				if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
					errorMessage = 'Camera access denied. Please grant permission in your browser settings.';
				} else if (error.name === 'NotFoundError') {
					errorMessage = 'No camera found. Please ensure a camera is connected.';
				} else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
					errorMessage = 'Camera is already in use or unavailable.';
				} else if (error.name === 'OverconstrainedError') {
					errorMessage =
						'Camera constraints could not be satisfied. Trying a different camera might help.';
				} else if (error.name === 'AbortError') {
					errorMessage =
						'Camera access was aborted. This might happen if the permission dialog was closed.';
				}
			} else if (error instanceof Error) {
				errorMessage = `Error accessing camera: ${error.message}`;
			}
			toast.error(errorMessage);
		}
	}

	function switchCamera() {
		if (availableVideoDevices.length > 1) {
			selectedVideoDeviceIndex = (selectedVideoDeviceIndex + 1) % availableVideoDevices.length;
			startVideo();
		}
	}

	async function stopVideo() {
		if (videoElem.srcObject) {
			const stream = videoElem.srcObject as MediaStream;
			const tracks = stream.getTracks();
			tracks.forEach((track) => track.stop());
			videoElem.srcObject = null;
		}
		streaming = false;
	}

	function scanForCode() {
		if (streaming) {
			canvasElem.width = videoElem.videoWidth;
			canvasElem.height = videoElem.videoHeight;
			const ctx = canvasElem.getContext('2d');
			if (ctx) {
				ctx.drawImage(videoElem, 0, 0, videoElem.videoWidth, videoElem.videoHeight);
				canvasElem.toBlob(async (blob) => {
					if (blob) {
						barcodeDetector
							.detect(canvasElem)
							.then((barcodes) => {
								if (barcodes.length > 0) {
									const barcode = barcodes[0];
									const code = barcode.rawValue;
									if (code) {
										stopVideo();
										$params.queryUserId = code;
									} else {
										throw new Error('Barcode value is empty');
									}
								}
							})
							.catch((error) => {
								toast.error('Error detecting barcode: ' + error);
							});
					}
				}, 'image/jpeg');
			}
		}
	}

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

	$effect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;
		if (streaming && !$params.queryUserId) {
			intervalId = setInterval(scanForCode, 500);
		} else if ($params.queryUserId) {
			userData.fetch({
				variables: {
					userId: $params.queryUserId,
					conferenceId: data.conferenceId
				}
			});
		}
		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	// Open drawer when user data loads successfully
	// Close drawer immediately when queryUserId changes (new scan), reopen when fresh data arrives
	let lastLoadedUserId = $state('');
	$effect(() => {
		const queryId = $params.queryUserId;
		if (!queryId) {
			showUserDrawer = false;
			lastLoadedUserId = '';
			return;
		}
		// New scan detected — close drawer until fresh data loads
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

	onDestroy(() => {
		if (streaming) {
			stopVideo();
		}
	});

	$effect(() => {
		if (!$useCamera) {
			if (streaming) {
				stopVideo();
			}
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

			// Save access card ID
			if (accessCardInput.trim()) {
				await changeAdministrativeStatus(statusDetails?.id, userDetails.id, {
					accessCardId: accessCardInput.trim()
				});
			}

			// Create attendance entry if occasion is set
			if ($occasion.trim()) {
				await createAttendanceEntryMutation.mutate({
					userId: userDetails.id,
					conferenceId: data.conferenceId,
					occasion: $occasion.trim()
				});
			}

			toast.success(m.accessFlowSaved());

			// Close drawer and reset for next participant
			showUserDrawer = false;
			$params.queryUserId = '';
			accessCardInput = '';
			editingGivenName = false;
			editingFamilyName = false;
			editingBirthday = false;

			// Re-focus scanner input after drawer close animation
			if ($useCamera) {
				startVideo();
			} else {
				setTimeout(() => {
					if (manualInputElem) {
						manualInputElem.value = '';
						manualInputElem.focus();
					}
				}, 300);
			}
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
		// Re-focus scanner input after drawer close animation
		if ($useCamera) {
			startVideo();
		} else {
			setTimeout(() => {
				if (manualInputElem) {
					manualInputElem.value = '';
					manualInputElem.focus();
				}
			}, 300);
		}
	};

	// --- Hotkeys ---

	onMount(() => {
		if ($params.queryUserId && manualInputElem) {
			manualInputElem.value = $params.queryUserId;
		}

		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+enter', () => {
			if ($params.queryUserId && $userData?.data?.findUniqueUser && !hotkeyDebounce) {
				saveAndNext();
			}
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+enter');
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

		<FormFieldset title={m.cameraSettings()}>
			<label for="useCamera" class="mr-2">
				<input
					type="checkbox"
					id="useCamera"
					bind:checked={$useCamera}
					class="toggle toggle-primary mr-2"
				/>
				{m.useCameraForScanning()}</label
			>
			{#if $useCamera}
				<button class="btn btn-primary mt-4" disabled={streaming} onclick={startVideo}>
					<i class="fa-solid fa-video"></i>
					{m.startCamera()}
				</button>
				<button
					class="btn btn-secondary mt-2"
					disabled={availableVideoDevices.length <= 1}
					onclick={switchCamera}
				>
					<i class="fa-solid fa-camera-rotate"></i>
					{m.switchCamera()}
				</button>
			{/if}
		</FormFieldset>
	</div>

	{#if !$useCamera}
		<FormFieldset title={m.userIdInput()}>
			<div class="join">
				<input
					type="text"
					bind:this={manualInputElem}
					placeholder={m.enterPostalRegistrationCode()}
					class="input w-full input-lg join-item"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							$params.queryUserId = manualInputElem?.value ?? '';
							manualInputElem?.blur();
						}
					}}
				/>
				<button
					class="btn btn-primary btn-lg join-item"
					aria-label="Search user by ID"
					onclick={() => {
						$params.queryUserId = manualInputElem?.value ?? '';
						manualInputElem?.blur();
					}}
				>
					<i class="fa-solid fa-magnifying-glass"></i>
				</button>
			</div>
		</FormFieldset>
	{/if}

	<!-- Camera preview -->
	<div
		class="media-container {!$useCamera || $params.queryUserId
			? 'hidden'
			: ''} bg-primary relative z-30 flex aspect-video max-w-1/3 items-center justify-center overflow-hidden rounded-lg shadow-lg lg:fixed lg:top-4 lg:right-4 lg:w-60"
	>
		<i
			class="fas fa-camera absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-3xl text-white"
		></i>
		<video bind:this={videoElem} autoplay playsinline>
			<track kind="captions" src="" srclang="en" label="English" default />
		</video>
		<canvas bind:this={canvasElem} class="hidden"></canvas>
	</div>

	{#if $useCamera}
		<div class="flex flex-col gap-2">
			<div
				class="bg-base-200 border-1 border-base-300 flex h-18 w-full max-w-md items-center gap-6 rounded-box p-6"
			>
				<i class="fa-duotone fa-barcode-read {!$params.queryUserId && 'fa-beat-fade'} text-2xl"></i>
				<div class="truncate font-mono text-sm">
					{$params.queryUserId ? $params.queryUserId : m.scanPostalRegistrationCodePrompt()}
				</div>
			</div>
		</div>
	{/if}

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
<Drawer.Root bind:open={showUserDrawer} direction="top">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
		<Drawer.Content
			class="bg-base-100 fixed top-0 left-1/2 z-50 flex max-h-[85vh] w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-b-2xl outline-none"
		>
			{#if $userData?.data?.findUniqueUser && $userData.data.findUniqueUser.id === $params.queryUserId}
				{@const userDetails = $userData.data.findUniqueUser}
				{@const statusDetails = $userData.data.findUniqueConferenceParticipantStatus}

				<!-- Header: title + profile link + close -->
				<div class="flex items-center justify-between px-5 pt-4 pb-3">
					<Drawer.Title class="flex items-center gap-2 text-lg font-bold">
						<i class="fa-duotone fa-id-badge text-xl"></i>
						{m.identityCheck()}
					</Drawer.Title>
					<div class="flex gap-2">
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
					</div>
				</div>

				<!-- Scrollable content -->
				<div class="flex-1 overflow-y-auto px-5 pb-5" data-vaul-no-drag>
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
				</div>

				<!-- Sticky footer with action buttons -->
				<div class="border-base-300 flex gap-2 border-t p-4">
					<button class="btn btn-primary flex-1" onclick={saveAndNext} disabled={hotkeyDebounce}>
						<i class="fa-solid fa-check"></i>
						{m.saveAndNext()}
						<span class="kbd kbd-sm">alt+enter</span>
					</button>
					<button class="btn btn-error" onclick={resetView}>
						<i class="fa-solid fa-xmark"></i>
						{m.close()}
						<span class="kbd kbd-sm">Esc</span>
					</button>
				</div>

				<!-- Drag handle (bottom for top drawer) -->
				<div class="flex justify-center pb-3 pt-1">
					<div class="bg-base-content/30 h-1.5 w-12 rounded-full"></div>
				</div>
			{/if}
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
