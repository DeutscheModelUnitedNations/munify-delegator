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
	import { confirmAllChange, scannedUserWithStatus } from './postalConfirm';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker';
	import { createPersistedState } from '#lib/state/persistedState.svelte.js';
	import type { CameraPage } from '#lib/components/scanner/pageCamera.svelte';
	import { nameOfUser, takeCameraPage, type CameraLogEntry } from './cameraIntake';
	import CameraLog from './CameraLog.svelte';
	import PaperBatch from './PaperBatch.svelte';
	import AgreementDetails from '#lib/components/postal/AgreementDetails.svelte';
	import PostalScans from '#lib/components/postal/PostalScans.svelte';
	import LoadBoundary from '#lib/components/LoadBoundary.svelte';

	let { params: routeParams }: PageProps = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: routeParams.conferenceId },
			id: true,
			startConference: true
		})
	);

	/** Whether a person born on `dateOfBirth` still needs a guardian's consent at the conference. */
	const needsGuardian = (dateOfBirth: Date | string | undefined | null) =>
		!ofAgeAtConference({ startConference: conference?.startConference, dateOfBirth });

	// --- Data queries ---

	/** The status fields this page shows and changes. */
	const postalStatusFields = {
		id: true,
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		mediaConsentStatus: true,
		assignedDocumentNumber: true,
		agreementDetails: { field: true, state: true, source: true }
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

	/** The pages the camera read, the latest first, those that went wrong listed apart. */
	let cameraLog = $state<CameraLogEntry[]>([]);
	/** The camera's pages are kept one after the other, in the order they were read. */
	let keeping: Promise<unknown> = Promise.resolve();
	const LOG_LENGTH = 200;

	/** Keeps a page the camera read and lists it; answers what the camera has to say of it. */
	async function keepPage(page: CameraPage) {
		const taken = await takeCameraPage({ page, conferenceId: routeParams.conferenceId });
		const entry = { ...taken, id: cameraLog.length + 1, name: await nameOfUser(taken.userId) };
		cameraLog = [entry, ...cameraLog].slice(0, LOG_LENGTH);
		return taken.newProblem ? taken.problem : undefined;
	}

	function takePage(page: CameraPage) {
		const kept = keeping.then(() => keepPage(page));
		keeping = kept.catch(() => undefined);
		return kept;
	}

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
	confirmLabel={m.confirmAll()}
	onConfirm={confirmAllStatuses}
	onClose={() => flow.reset()}
	takePage={readsPages ? takePage : undefined}
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
		<CameraLog entries={cameraLog} />
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
		{@const guardianNeeded = needsGuardian(userDetails.birthday)}

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
			{#if guardianNeeded}
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

		{#if postalRegistrationDetails}
			{@const conferenceParticipantId = postalRegistrationDetails.id}
			<LoadBoundary>
				<section class="mt-6 flex flex-col gap-3">
					<h3 class="text-lg font-bold">{m.userCardDocuments()}</h3>
					<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y px-4 py-1">
						<PostalScans
							conferenceId={routeParams.conferenceId}
							userId={userDetails.id}
							{conferenceParticipantId}
							unfolded
						/>
						<AgreementDetails {conferenceParticipantId} {guardianNeeded} />
					</div>
				</section>
			</LoadBoundary>
		{/if}
	{/snippet}
</ScanFlowPage>
