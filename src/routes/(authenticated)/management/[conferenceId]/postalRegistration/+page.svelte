<script lang="ts">
	import {
		cache,
		graphql,
		type MediaConsentStatus$options,
		type UpdateConferenceParticipantStatusInput
	} from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import { BarcodeDetector } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';

	import { onDestroy, onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import StatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';

	let { data }: { data: PageData } = $props();

	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let selectedVideoDeviceIndex = $state(0);

	let pageQuery = $derived(data.PostalRegistrationPageQuery);

	let videoElem: HTMLVideoElement;
	let canvasElem: HTMLCanvasElement;
	let streaming = $state(false);

	let params = queryParameters({ queryUserId: true });

	let useCamera = persisted('useCameraForPostalRegistration', false);

	let manualInputElem = $state<HTMLInputElement>();

	let hotkeyDebounce = $state(false);

	const barcodeDetector: BarcodeDetector = new BarcodeDetector({
		formats: ['data_matrix']
	});

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
				errorMessage = `Error accessing camera: ${error.name} - ${error.message}`;
				// Differentiate common user-facing errors
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
				// Draw the current video frame (needed for toBlob conversion)
				ctx.drawImage(videoElem, 0, 0, videoElem.videoWidth, videoElem.videoHeight);
				// Convert the drawn image into a blob then to an ArrayBuffer (buffer)
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

	$effect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;
		if (streaming && !$params.queryUserId) {
			// Automatically scan every 500ms
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

	const changeAdministrativeStatus = async (
		statusId: string | undefined,
		userId: string | undefined,
		mutationData: UpdateConferenceParticipantStatusInput
	) => {
		if (!userId) {
			toast.error(m.userNotFound());
			return;
		}
		await toast.promise(
			changeParticipantStatus.mutate({
				where: { id: statusId, conferenceId: data.conferenceId, userId },
				data: mutationData
			}),
			genericPromiseToastMessages
		);
		cache.markStale();
		userData.fetch();
	};

	onMount(() => {
		if ($params.queryUserId && manualInputElem) {
			manualInputElem.value = $params.queryUserId;
		}

		hotkeys('esc', (event) => {
			if ($params.queryUserId) {
				$params.queryUserId = '';
				startVideo();
			}
			if (manualInputElem) {
				manualInputElem.value = '';
				$params.queryUserId = '';
				manualInputElem.focus();
			}
		});

		hotkeys('alt+enter', (event) => {
			if ($params.queryUserId) {
				const userDetails = $userData?.data?.findUniqueUser;
				const postalRegistrationDetails = $userData?.data?.findUniqueConferenceParticipantStatus;
				if (userDetails && postalRegistrationDetails && !hotkeyDebounce) {
					hotkeyDebounce = true;
					changeAdministrativeStatus(postalRegistrationDetails.id, userDetails.id, {
						termsAndConditions: 'DONE',
						mediaConsent: 'DONE',
						guardianConsent: !ofAgeAtConference(
							$pageQuery.data.findUniqueConference.startConference,
							userDetails?.birthday
						)
							? 'DONE'
							: undefined,
						mediaConsentStatus: 'ALLOWED_ALL'
					}).finally(() => {
						hotkeyDebounce = false;
					});
				}
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
		<h2 class="text-2xl font-bold">{m.postalRegistration()}</h2>
		<p>{@html m.scanPostalRegistrationCode()}</p>

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

	<!-- Always render the media container; hide it if queryUserId exists -->
	<div
		class="media-container {!$useCamera || $params.queryUserId
			? 'hidden'
			: ''} bg-primary relative z-50 flex aspect-video max-w-1/3 items-center justify-center overflow-hidden rounded-lg shadow-lg lg:fixed lg:top-4 lg:right-4 lg:w-60"
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

	{#if $params.queryUserId && $userData?.data?.findUniqueUser}
		{@const userDetails = $userData?.data?.findUniqueUser}
		{@const postalRegistrationDetails = $userData?.data?.findUniqueConferenceParticipantStatus}

		<div class="flex w-full flex-col gap-2">
			<div class="bg-base-200 border-1 border-base-300 flex w-full flex-col gap-4 rounded-box p-6">
				<div class="mb-2 flex w-full items-center gap-6">
					<i class="fa-duotone fa-user text-2xl"></i>
					{#if $userData.fetching}
						<div class="skeleton bg-base-300 h-9 w-full"></div>
					{:else}
						<div class="flex-grow">
							<h3 class="text-base font-bold md:text-xl">
								{formatNames(userDetails?.given_name, userDetails?.family_name)}
							</h3>
							<h5 class="text-sm">
								{userDetails?.birthday ? userDetails?.birthday.toLocaleDateString() : ''}
							</h5>
						</div>
					{/if}
					<a
						class="btn btn-ghost {$userData?.fetching && 'btn-disabled'}"
						href={`/management/${data.conferenceId}/participants?selected=${$params.queryUserId}`}
						aria-label="View participant details"
					>
						<i class="fa-duotone fa-up-right-from-square"></i>
					</a>
				</div>
				<div class="grid grid-cols-1 grid-rows-5 xl:grid-cols-2 xl:grid-rows-3 gap-4 grid-flow-col">
					<ParticipantAssignedDocumentWidget
						assignedDocumentNumber={$userData?.data?.findUniqueConferenceParticipantStatus
							?.assignedDocumentNumber}
						onSave={async (number?: number) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								assignedDocumentNumber: number,
								assignNextDocumentNumber: !number
							})}
					/>
					<StatusWidget
						title={m.userAgreement()}
						faIcon="fa-file-signature"
						status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
						changeStatus={async (newStatus: AdministrativeStatus) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								termsAndConditions: newStatus
							})}
						doneHotkey="alt+1"
					/>
					{#if !ofAgeAtConference($pageQuery.data.findUniqueConference.startConference, userDetails?.birthday)}
						<StatusWidget
							title={m.guardianAgreement()}
							faIcon="fa-user-shield"
							status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
							changeStatus={async (newStatus: AdministrativeStatus) =>
								await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
									guardianConsent: newStatus
								})}
							doneHotkey="alt+2"
						/>
					{:else}
						<div
							class="flex flex-col justify-center items-center rounded-box bg-base-100 p-4 gap-2"
						>
							<i class="fa-solid fa-xmark-circle text-3xl"></i>
							<h3 class="font-bold">{m.guardianAgreementNotNeeded()}</h3>
						</div>
					{/if}
					<StatusWidget
						title={m.mediaAgreement()}
						faIcon="fa-camera"
						status={postalRegistrationDetails?.mediaConsent ?? 'PENDING'}
						changeStatus={async (newStatus: AdministrativeStatus) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								mediaConsent: newStatus
							})}
						doneHotkey="alt+3"
					/>
					<ParticipantStatusMediaWidget
						title={m.mediaConsentStatus()}
						status={postalRegistrationDetails?.mediaConsentStatus ?? 'NOT_SET'}
						changeStatus={async (newStatus: MediaConsentStatus$options) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								mediaConsentStatus: newStatus
							})}
						doneHotkey="alt+4"
					/>
				</div>
				<button class="btn btn-error w-full" onclick={() => ($params.queryUserId = '')}>
					<i class="fa-solid fa-xmark"></i>
					{m.close()}
					<span class="kbd kbd-sm">Esc</span>
				</button>
			</div>
		</div>
	{:else if $userData.fetching}
		<div class="skeleton bg-base-300 h-52 w-full"></div>
	{:else if $params.queryUserId}
		<div class="alert alert-warning">
			<i class="fa-solid fa-triangle-exclamation text-lg"></i>
			<div>{m.userNotFoundForPostalRegistration()}</div>
		</div>
	{/if}
</div>
