<script lang="ts">
	import { logger } from '#lib/logger';
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
	import { addPicture, mergeFrames, type TakenPage } from '#lib/paperScan/frames';
	import { readPageOfCode } from '#lib/paperScan/readScan';
	import { changesAnything, proposePaperChange } from '#lib/paperScan/proposal';
	import type { FieldReading } from '#lib/paperScan/readPaper';
	import PaperReading from './PaperReading.svelte';
	import PaperBatch from './PaperBatch.svelte';
	import AgreementDetails from '#lib/components/postal/AgreementDetails.svelte';
	import PostalScans from '#lib/components/postal/PostalScans.svelte';
	import LoadBoundary from '#lib/components/LoadBoundary.svelte';

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

	/** What was read off each person's pages so far, by user id: a later page adds to it. */
	let readings = $state<Record<string, FieldReading[]>>({});
	/** The pictures taken of each code's page so far. */
	const taken: Record<string, TakenPage> = {};

	/**
	 * Reads the page a code was scanned on, over several pictures that have to agree; true once it
	 * is done with, settled or given up on.
	 */
	async function readPage({ frame, code }: { frame: ImageData; code: string }) {
		const page = addPicture({
			taken: taken[code],
			read: readPageOfCode({ picture: frame, code })
		});
		taken[code] = page;
		if (!page.done) return false;
		delete taken[code];
		keepReadings({ code, frames: page.frames });
		return true;
	}

	/** Adds what a page's pictures say to its person's readings. */
	function keepReadings({ code, frames }: { code: string; frames: FieldReading[][] }) {
		if (frames.length === 0) {
			toast.info(m.paperPageNotReadable());
			return;
		}
		const userId = userIdOfCode(code);
		readings[userId] = [...(readings[userId] ?? []), ...mergeFrames(frames)];
	}

	/** What the scanned person's pages say, against their status as it stands. */
	// fallow-ignore-next-line complexity
	const proposal = $derived.by(() => {
		const current = flow.current;
		const read = current?.user ? readings[current.user.id] : undefined;
		if (!readsPages || !current || !read || read.length === 0) return undefined;
		return proposePaperChange({
			readings: read,
			known: current.status?.agreementDetails ?? [],
			status: postalStatusOf(current.status),
			confirm: true,
			minor: !ofAgeAtConference({
				startConference: conference?.startConference,
				dateOfBirth: current.user?.birthday
			})
		});
	});

	/** Keeps the details behind the statuses; failing that does not stop the scanning. */
	async function recordDetails(userId: string) {
		try {
			await client.mutate.recordPaperReadings({
				__args: {
					conferenceId: routeParams.conferenceId,
					userId,
					readings: readings[userId] ?? [],
					confirm: true
				}
			});
		} catch (error) {
			logger.warn('Saving the details of a page failed', error);
			toast.error(m.genericToastError());
		}
	}

	/** Saves what the paper says and readies the scanner for the next page. */
	const confirmPaper = () =>
		flow.runExclusive(async () => {
			const scanned = scannedUserWithStatus(flow.data);
			if (scanned && proposal) {
				if (changesAnything(proposal.change)) {
					await changeAdministrativestatusEnum({
						statusId: scanned.status.id,
						userId: scanned.user.id,
						change: proposal.change
					});
				}
				await recordDetails(scanned.user.id);
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

		{#if postalRegistrationDetails}
			{@const conferenceParticipantId = postalRegistrationDetails.id}
			<LoadBoundary>
				<div class="mt-6 flex flex-col gap-4">
					<PostalScans
						conferenceId={routeParams.conferenceId}
						userId={userDetails.id}
						{conferenceParticipantId}
					/>
					<AgreementDetails {conferenceParticipantId} />
				</div>
			</LoadBoundary>
		{/if}
	{/snippet}
</ScanFlowPage>
