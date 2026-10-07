<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client, type MediaconsentstatusEnum } from '$lib/api/rumbleClient/client';
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import StatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';
	import ScanFlowPage from '$lib/components/scanner/ScanFlowPage.svelte';
	import {
		ScannedUserFlow,
		type StatusChange
	} from '$lib/components/scanner/scannedUserFlow.svelte';
	import type { PageProps } from './$types';
	import { confirmAllChange, scannedUserWithStatus } from './postalConfirm';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';

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
	const flow = new ScannedUserFlow(async (userId) => {
		const statuses = await client.query.conferenceParticipantStatuses({
			__args: {
				where: { conferenceId: { eq: routeParams.conferenceId }, userId: { eq: userId } }
			},
			...postalStatusFields
		});
		return statuses.at(0) ?? null;
	});

	// --- Actions ---

	const changeAdministrativestatusEnum = (
		statusId: string | undefined,
		userId: string | undefined,
		change: StatusChange
	) =>
		flow.changeStatus(userId, (userId) =>
			client.mutate.updateConferenceParticipantStatus({
				__args: { ...change, id: statusId, conferenceId: routeParams.conferenceId, userId },
				...postalStatusFields
			})
		);

	const confirmAllStatuses = () =>
		flow.runExclusive(async () => {
			const scanned = scannedUserWithStatus(flow.data);
			if (!scanned) {
				toast.error(m.userNotFound());
				return;
			}

			await changeAdministrativestatusEnum(
				scanned.status.id,
				scanned.user.id,
				confirmAllChange(conference?.startConference, scanned.user.birthday)
			);
		});
</script>

<ScanFlowPage
	{flow}
	title={m.postalRegistration()}
	barcodeFormats={['data_matrix']}
	persistKey="useCameraForPostalRegistration"
	notFoundMessage={m.userNotFoundForPostalRegistration()}
	drawerTitle={m.postalRegistration()}
	drawerIcon="fa-envelopes-bulk"
	drawerMaxWidth="max-w-4xl"
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
			changeAdministrativestatusEnum(postalRegistrationDetails?.id, userDetails.id, statusChange)}

		<!-- User info -->
		<div class="mb-4 flex items-center gap-4">
			<i class="fa-duotone fa-user text-2xl"></i>
			<div class="grow">
				<h3 class="text-xl font-bold">
					{formatNames(userDetails.givenName ?? undefined, userDetails.familyName ?? undefined)}
				</h3>
				<p class="text-sm opacity-60">
					{userDetails.birthday ? userDetails.birthday.toLocaleDateString() : ''}
				</p>
			</div>
		</div>

		<!-- Status widgets grid -->
		<div class="grid grid-flow-col grid-cols-1 grid-rows-5 gap-4 md:grid-cols-2 md:grid-rows-3">
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
			{#if !ofAgeAtConference(conference?.startConference, userDetails.birthday)}
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
