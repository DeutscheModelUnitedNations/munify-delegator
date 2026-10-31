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
				client.mutate.updateConferenceParticipant({
					__args: { ...change, id: statusId, conferenceId: routeParams.conferenceId, userId },
					...postalStatusFields
				})
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
	barcodeFormats={['data_matrix']}
	persistKey="useCameraForPostalRegistration"
	notFoundMessage={m.userNotFoundForPostalRegistration()}
	drawerTitle={m.postalRegistration()}
	drawerIcon="fa-envelopes-bulk"
	confirmLabel={m.confirmAll()}
	onConfirm={confirmAllStatuses}
	onClose={() => flow.reset()}
>
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
			<i class="fa-sharp-duotone fa-solid fa-user text-2xl"></i>
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
				faIcon="fa-file-signature"
				status={postalRegistrationDetails?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await change({ termsAndConditions: newStatus })}
			/>
			{#if !ofAgeAtConference( { startConference: conference?.startConference, dateOfBirth: userDetails.birthday } )}
				<StatusWidget
					title={m.guardianAgreement()}
					faIcon="fa-user-shield"
					status={postalRegistrationDetails?.guardianConsent ?? 'PENDING'}
					changeStatus={async (newStatus: AdministrativestatusEnum) =>
						await change({ guardianConsent: newStatus })}
				/>
			{:else}
				<GuardianConsentNotNeeded />
			{/if}
			<StatusWidget
				title={m.mediaAgreement()}
				faIcon="fa-camera"
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
