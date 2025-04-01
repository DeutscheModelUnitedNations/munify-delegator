<script lang="ts">
	import { cache, graphql, type UpdateConferenceParticipantStatusInput } from '$houdini';
	import { PaymentReferenceByIdQueryStore } from '$houdini/plugins/houdini-svelte/stores/PaymentReferenceByIdQuery';
	import * as m from '$lib/paraglide/messages';
	import { languageTag } from '$lib/paraglide/runtime';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { type PageData } from './$houdini';
	import { fly, fade } from 'svelte/transition';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import { BarcodeDetector } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';

	import { onDestroy, onMount } from 'svelte';
	import { toast } from '@zerodevx/svelte-toast';
	import StatusWidget from '$lib/components/StatusWidget.svelte';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';

	let { data }: { data: PageData } = $props();

	let videoElem: HTMLVideoElement;
	let canvasElem: HTMLCanvasElement;
	let streaming = false;

	let queryUserId = $state('');
	// let queryUserId = $state('298967658244603906');

	const barcodeDetector: BarcodeDetector = new BarcodeDetector({
		// make sure the formats are supported
		formats: ['data_matrix']
	});

	async function startVideo() {
		queryUserId = '';
		if (!videoElem) {
			console.error('videoElem is not available.');
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			videoElem.srcObject = stream;
			await videoElem.play();
			streaming = true;
		} catch (error) {
			console.error('Error accessing camera:', error);
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
										queryUserId = code;
									} else {
										throw new Error('Barcode value is empty');
									}
								}
							})
							.catch((error) => {
								toast.push('Error detecting barcode: ' + error, {
									duration: 5000,
									dismissable: true
								});
							});
					}
				}, 'image/jpeg');
			}
		}
	}

	$effect(() => {
		if (!queryUserId) {
			startVideo();
			// Automatically scan every 500ms
			setInterval(scanForCode, 500);
		}
	});

	onDestroy(() => {
		if (streaming) {
			stopVideo();
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
				mediaConsent
				guardianConsent
			}
		}
	`);

	$effect(() => {
		if (queryUserId) {
			userData.fetch({
				variables: {
					userId: queryUserId,
					conferenceId: data.conferenceId
				}
			});
		}
	});

	const changeAdministrativeStatus = async (
		statusId: string | undefined,
		userId: string | undefined,
		mutationData: UpdateConferenceParticipantStatusInput
	) => {
		if (!userId) {
			toast.push(m.userNotFound(), {
				duration: 5000,
				dismissable: true
			});
			return;
		}
		await changeParticipantStatus.mutate({
			where: { id: statusId, conferenceId: data.conferenceId, userId },
			data: mutationData
		});
		cache.markStale();
		userData.fetch();
	};

	hotkeys('esc', (event) => {
		if (queryUserId) {
			queryUserId = '';
		}
	});

	hotkeys('enter', (event) => {
		if (queryUserId) {
			const userDetails = $userData?.data?.findUniqueUser;
			const postalRegistrationDetails = $userData?.data?.findUniqueConferenceParticipantStatus;
			if (userDetails && postalRegistrationDetails) {
				changeAdministrativeStatus(postalRegistrationDetails.id, userDetails.id, {
					termsAndConditions: 'DONE',
					mediaConsent: 'DONE',
					guardianConsent: 'DONE'
				});
			}
		}
	});
</script>

<div class="flex w-full flex-col gap-8 md:p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.postalRegistration()}</h2>
		<p>{@html m.scanPostalRegistrationCode()}</p>
	</div>

	<!-- Always render the media container; hide it if queryUserId exists -->
	<div
		class="media-container {queryUserId
			? 'hidden'
			: ''} max-w-1/3 relative z-50 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-primary shadow-lg lg:fixed lg:right-4 lg:top-4 lg:w-60"
	>
		<i
			class="fas fa-camera absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-3xl text-white"
		></i>
		<video bind:this={videoElem} autoplay playsinline>
			<track kind="captions" src="" srclang="en" label="English" default />
		</video>
		<canvas bind:this={canvasElem} class="hidden"></canvas>
	</div>

	<div class="flex flex-col gap-2">
		<div class="h-18 flex w-full max-w-md items-center gap-6 rounded-3xl bg-base-200 p-6">
			<i class="fa-duotone fa-barcode-read {!queryUserId && 'fa-beat-fade'} text-2xl"></i>
			<div class="truncate font-mono text-sm">
				{queryUserId ? queryUserId : m.scanPostalRegistrationCodePrompt()}
			</div>
		</div>
	</div>

	{#if queryUserId}
		{@const userDetails = $userData?.data?.findUniqueUser}
		{@const postalRegistrationDetails = $userData?.data?.findUniqueConferenceParticipantStatus}

		<div class="flex w-full max-w-md flex-col gap-2">
			<div class="flex w-full flex-col gap-4 rounded-3xl bg-base-200 p-6">
				<div class="mb-2 flex w-full items-center gap-6">
					<i class="fa-duotone fa-user text-2xl"></i>
					{#if $userData.fetching}
						<div class="skeleton h-9 w-full bg-base-300"></div>
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
						href={`/management/${data.conferenceId}/participants?filter=${queryUserId}`}
						aria-label="View participant details"
					>
						<i class="fa-duotone fa-up-right-from-square"></i>
					</a>
				</div>
				{#if $userData.fetching}
					<div class="skeleton h-52 w-full bg-base-300"></div>
				{:else}
					<StatusWidget
						title={m.userAgreement()}
						faIcon="fa-file-signature"
						status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
						changeStatus={async (newStatus: AdministrativeStatus) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								termsAndConditions: newStatus
							})}
						doneHotkey="1"
					/>
					<StatusWidget
						title={m.guardianAgreement()}
						faIcon="fa-user-shield"
						status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
						changeStatus={async (newStatus: AdministrativeStatus) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								guardianConsent: newStatus
							})}
						doneHotkey="2"
					/>
					<StatusWidget
						title={m.mediaAgreement()}
						faIcon="fa-camera"
						status={postalRegistrationDetails?.mediaConsent ?? 'PENDING'}
						changeStatus={async (newStatus: AdministrativeStatus) =>
							await changeAdministrativeStatus(postalRegistrationDetails?.id, userDetails?.id, {
								mediaConsent: newStatus
							})}
						doneHotkey="3"
					/>
				{/if}
				<button class="btn btn-error w-full" onclick={() => (queryUserId = '')}>
					<i class="fa-solid fa-xmark"></i>
					{m.close()}
					<span class="kbd kbd-sm">Esc</span>
				</button>
			</div>
		</div>
	{/if}
</div>
