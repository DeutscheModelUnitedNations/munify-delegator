<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { client, type MediaconsentstatusEnum } from '#lib/api/rumbleClient/client';
	import type { AdministrativestatusEnum } from '#lib/api/rumbleClient/client';
	import formatNames from '#lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import StatusWidget from '#lib/components/ParticipantStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '#lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '#lib/components/ParticipantAssignedDocumentWidget.svelte';
	import Kbd from '#lib/components/Kbd.svelte';
	import GuardianConsentNotNeeded from '#lib/components/GuardianConsentNotNeeded.svelte';
	import ScanFlowPage from '#lib/components/scanner/ScanFlowPage.svelte';
	import {
		createScannedUserFlow,
		type StatusChange
	} from '#lib/components/scanner/scannedUserFlow.svelte.js';
	import type { PageProps } from './$types';
	import { confirmAllChange, postalStatusOf, scannedUserWithStatus } from './postalConfirm';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker';
	import { createPersistedState } from '#lib/state/persistedState.svelte.js';
	import { userIdOfCode } from '#lib/components/scanner/scanAcceptance';
	import { readPageOfCode } from '#lib/paperScan/readScan';
	import { changesAnything, proposePaperChange } from '#lib/paperScan/proposal';
	import type { FieldReading } from '#lib/paperScan/readPaper';
	import PaperReading from './PaperReading.svelte';
	import PaperBatch from './PaperBatch.svelte';

	let { params: routeParams }: PageProps = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: routeParams.conferenceId },
			id: true,
			startConference: true,
			nextDocumentNumber: true
		})
	);

	// --- Data queries ---

	/** The status fields this page shows and changes. */
	const postalStatusFields = {
		id: true,
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		mediaConsentStatus: true,
		assignedDocumentNumber: true
	} as const;

	/** The postal paperwork we are here to tick off. */
	const flow = createScannedUserFlow(async (userId) => {
		const statuses = await client.query.conferenceParticipants({
			__args: {
				where: { conferenceId: { eq: routeParams.conferenceId }, userId: { eq: userId } }
			},
			...postalStatusFields
		});
		return statuses.at(0) ?? null;
	});

	// --- Actions ---

	const changeAdministrativestatusEnum = ({
		statusId,
		userId,
		change
	}: {
		statusId: string | undefined;
		userId: string | undefined;
		change: StatusChange;
	}) =>
		flow.changeStatus({
			userId,
			write: (userId) =>
				client.mutate.upsertConferenceParticipant({
					__args: { ...change, id: statusId, conferenceId: routeParams.conferenceId, userId },
					...postalStatusFields
				})
		});

	// --- Reading the paper (`#lib/paperScan`) ---

	/** Whether the camera reads the whole page, its fields too, or only the code. */
	const pageMode = createPersistedState({ key: 'postalRegistrationReadsPages', initial: true });
	const readsPages = $derived(pageMode.current);

	/** What was read off each person's pages so far, by user id: a later page adds to it. */
	let readings = $state<Record<string, FieldReading[]>>({});
	/** How often each code's page could not be read in a picture. */
	const failedReads: Record<string, number> = {};
	/** About three seconds of pictures: then the person is shown all the same. */
	const MAX_FAILED_READS = 10;

	/** Reads the page a code was scanned on; true once read, or once given up on. */
	// fallow-ignore-next-line complexity
	async function readPage({ frame, code }: { frame: ImageData; code: string }) {
		const read = readPageOfCode({ picture: frame, code });
		if (!read) {
			const failed = (failedReads[code] ?? 0) + 1;
			failedReads[code] = failed;
			if (failed < MAX_FAILED_READS) return false;
			toast.info(m.paperPageNotReadable());
		} else {
			const userId = userIdOfCode(code);
			readings[userId] = [...(readings[userId] ?? []), ...read];
		}
		delete failedReads[code];
		return true;
	}

	/** What the scanned person's pages say, against their status as it stands. */
	// fallow-ignore-next-line complexity
	const proposal = $derived.by(() => {
		const current = flow.current;
		const read = current?.user ? readings[current.user.id] : undefined;
		if (!readsPages || !current || !read || read.length === 0) return undefined;
		return proposePaperChange({
			readings: read,
			status: postalStatusOf(current.status),
			confirm: true,
			minor: !ofAgeAtConference({
				startConference: conference?.startConference,
				dateOfBirth: current.user?.birthday
			})
		});
	});

	/** Saves what the paper says and readies the scanner for the next page. */
	const confirmPaper = () =>
		flow.runExclusive(async () => {
			const scanned = scannedUserWithStatus(flow.data);
			if (scanned && proposal && changesAnything(proposal.change)) {
				await changeAdministrativestatusEnum({
					statusId: scanned.status.id,
					userId: scanned.user.id,
					change: proposal.change
				});
			}
			flow.reset();
		});

	const confirmAllStatuses = () =>
		flow.runExclusive(async () => {
			const scanned = scannedUserWithStatus(flow.data);
			if (!scanned) {
				toast.error(m.userNotFound());
				return;
			}

			await changeAdministrativestatusEnum({
				statusId: scanned.status.id,
				userId: scanned.user.id,
				change: confirmAllChange({
					startConference: conference?.startConference,
					birthday: scanned.user.birthday
				})
			});
		});
</script>

<ScanFlowPage
	{flow}
	conferenceId={routeParams.conferenceId}
	barcodeFormats={['qr_code']}
	acceptance={{ conferenceId: routeParams.conferenceId, kinds: ['print'], printedNametags: false }}
	persistKey="useCameraForPostalRegistration"
	notFoundMessage={m.userNotFoundForPostalRegistration()}
	drawerTitle={m.postalRegistration()}
	drawerIcon="ph-envelope-simple"
	confirmLabel={readsPages ? m.paperConfirm() : m.confirmAll()}
	onConfirm={readsPages ? confirmPaper : confirmAllStatuses}
	onClose={() => flow.reset()}
	readPage={readsPages ? readPage : undefined}
	scanPrompt={readsPages ? m.paperScanPrompt() : undefined}
>
	{#snippet cameraOverlay()}
		<!-- what the camera reads: the code alone, or the whole page with its boxes and signatures -->
		<label
			class="flex cursor-pointer items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white"
			data-tour="team.postalRegistration.paper"
		>
			<!-- names what is read now, so off plainly means the code alone -->
			<i
				aria-hidden="true"
				class="ph-duotone {readsPages ? 'ph-file-magnifying-glass' : 'ph-qr-code'}"
			></i>
			{readsPages ? m.paperScanModePage() : m.paperScanModeCode()}
			<input
				type="checkbox"
				class="toggle toggle-sm toggle-primary"
				bind:checked={pageMode.current}
				title={m.paperScanMode()}
			/>
		</label>
	{/snippet}

	{#snippet footer()}
		<PaperBatch conferenceId={routeParams.conferenceId} />
	{/snippet}

	{#snippet description()}
		{m.scanPostalRegistrationCode()}
		<Kbd hotkey="alt+a" size="xs" />
		{m.scanPostalRegistrationCodeHotkeyConfirmAll()}
		<Kbd hotkey="alt+1" size="xs" />, <Kbd hotkey="alt+2" size="xs" />, <Kbd
			hotkey="alt+3"
			size="xs"
		/>
		{m.scanPostalRegistrationCodeHotkeyMedia()}
	{/snippet}

	{#snippet children(userDetails, postalRegistrationDetails)}
		{@const change = (statusChange: StatusChange) =>
			changeAdministrativestatusEnum({
				statusId: postalRegistrationDetails?.id,
				userId: userDetails.id,
				change: statusChange
			})}

		<!-- User info -->
		<div class="mb-4 flex items-center gap-4">
			<i aria-hidden="true" class="ph-duotone ph-user text-2xl"></i>
			<div class="grow">
				<h3 class="text-xl font-bold">
					{formatNames({
						givenName: userDetails.givenName ?? undefined,
						familyName: userDetails.familyName ?? undefined
					})}
				</h3>
				<p class="text-sm opacity-60">
					{userDetails.birthday ? userDetails.birthday.toLocaleDateString(getLocale()) : ''}
				</p>
			</div>
		</div>

		{#if proposal}
			<div class="bg-info/10 rounded-box mb-4 flex flex-col gap-2 p-3" role="status">
				<span class="flex items-center gap-2 font-semibold">
					<i aria-hidden="true" class="ph-duotone ph-file-magnifying-glass"></i>
					{m.paperReadTitle()}
				</span>
				<PaperReading change={proposal.change} notes={proposal.notes} />
			</div>
		{/if}

		<!-- Status widgets grid -->
		<div class="grid grid-cols-1 gap-2 md:gap-4">
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={postalRegistrationDetails?.assignedDocumentNumber ?? undefined}
				onSave={async (number?: number) =>
					await change({ assignedDocumentNumber: number, assignNextDocumentNumber: !number })}
			/>
			<StatusWidget
				title={m.userAgreement()}
				icon="ph-signature"
				status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await change({ termsAndConditions: newStatus })}
			/>
			{#if !ofAgeAtConference( { startConference: conference?.startConference, dateOfBirth: userDetails.birthday } )}
				<StatusWidget
					title={m.guardianAgreement()}
					icon="ph-shield-star"
					status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
					changeStatus={async (newStatus: AdministrativestatusEnum) =>
						await change({ guardianConsent: newStatus })}
				/>
			{:else}
				<GuardianConsentNotNeeded />
			{/if}
			<StatusWidget
				title={m.mediaAgreement()}
				icon="ph-camera"
				status={postalRegistrationDetails?.mediaConsent ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await change({ mediaConsent: newStatus })}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={postalRegistrationDetails?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaconsentstatusEnum) =>
					await change({ mediaConsentStatus: newStatus })}
				hotkeys={{ NOT_ALLOWED: 'alt+1', PARTIALLY_ALLOWED: 'alt+2', ALLOWED_ALL: 'alt+3' }}
			/>
		</div>
	{/snippet}
</ScanFlowPage>
