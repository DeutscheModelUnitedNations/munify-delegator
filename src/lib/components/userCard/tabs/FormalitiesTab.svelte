<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type {
		AdministrativestatusEnum,
		MediaconsentstatusEnum
	} from '#lib/api/rumbleClient/client.js';
	import ParticipantPaymentWidget from '#lib/components/ParticipantPaymentWidget.svelte';
	import EmailLogSection from '../sections/EmailLogSection.svelte';
	import StatusRow, { type StatusOption } from '../sections/StatusRow.svelte';
	import DocumentNumberRow from '../sections/DocumentNumberRow.svelte';
	import { toast } from 'svelte-sonner';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker.js';
	import {
		downloadPostalRegistrationDocuments,
		fetchPostalRegistrationSources
	} from '#lib/api/postalRegistrationSources.js';
	import { postalRecipient } from '#lib/api/postalRegistrationData.js';
	import { careTeamPostalParticipant, documentFileName, hasPostalAddress } from './statusDownloads';
	import {
		changeParticipantStatus,
		fetchStatusWithAge,
		type StatusChange
	} from './participantStatus';

	/**
	 * What has to be settled before the conference: payment, the signed agreements and the postal
	 * documents, and the automatic mails that told the person about them.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor }: Props = $props();

	const data = $derived(await fetchStatusWithAge(userId, conferenceId));
	const status = $derived(data.statuses.at(0));
	const statusId = $derived(status?.id);

	const isAdult = $derived(ofAgeAtConference(data.conference.startConference, data.user.birthday));

	const administrativeOptions: StatusOption<AdministrativestatusEnum>[] = [
		{ value: 'PENDING', label: m.statusPending(), faIcon: 'hourglass-half', tone: 'warning' },
		{ value: 'PROBLEM', label: m.statusProblem(), faIcon: 'triangle-exclamation', tone: 'error' },
		{ value: 'DONE', label: m.statusDone(), faIcon: 'check', tone: 'success' }
	];

	const mediaConsentOptions: StatusOption<MediaconsentstatusEnum>[] = [
		{
			value: 'NOT_SET',
			label: m.mediaConsentStatusNotSet(),
			faIcon: 'clipboard-question',
			tone: 'warning'
		},
		{
			value: 'NOT_ALLOWED',
			label: m.mediaConsentStatusNotAllowed(),
			faIcon: 'camera-slash',
			tone: 'error'
		},
		{
			value: 'PARTIALLY_ALLOWED',
			label: m.mediaConsentStatusPartiallyAllowed(),
			faIcon: 'magnifying-glass',
			tone: 'warning'
		},
		{
			value: 'ALLOWED_ALL',
			label: m.mediaConsentStatusAllowedAll(),
			faIcon: 'camera',
			tone: 'success'
		}
	];

	const change = (input: StatusChange) =>
		changeParticipantStatus({ id: statusId, conferenceId, userId }, input);

	/** Everything the postal documents need is read when they are asked for, not kept live. */
	const downloadPostalDocs = async () => {
		try {
			const { user, conference } = await fetchPostalRegistrationSources(userId, conferenceId);
			if (!hasPostalAddress(conference)) {
				toast.error(m.httpGenericError());
				return;
			}
			const postal = careTeamPostalParticipant(user);
			if (!postal) {
				toast.error(m.httpMissingRequiredData());
				return;
			}
			await downloadPostalRegistrationDocuments({
				conference,
				birthday: postal.birthday,
				participant: postal.participant,
				recipient: postalRecipient(conference),
				fileName: documentFileName(user, 'postal_registration')
			});
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.httpGenericError());
		}
	};
</script>

<div class="flex flex-col gap-6">
	<section class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.payment()}</h3>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
			<StatusRow
				title={m.status()}
				faIcon="money-bill"
				active={status?.paymentStatus ?? 'PENDING'}
				options={administrativeOptions}
				change={(paymentStatus) => change({ paymentStatus })}
			/>
			<ParticipantPaymentWidget {userId} {conferenceId} />
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-lg font-bold">{m.userCardDocuments()}</h3>
			<button class="btn btn-sm" onclick={downloadPostalDocs}>
				<i class="fa-sharp-duotone fa-solid fa-file-pdf"></i>
				{m.downloadPostalDocuments()}
			</button>
		</div>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
			<StatusRow
				title={m.userAgreement()}
				faIcon="file-signature"
				active={status?.termsAndConditions ?? 'PENDING'}
				options={administrativeOptions}
				change={(termsAndConditions) => change({ termsAndConditions })}
			/>
			{#if !isConferenceSupervisor}
				{#if isAdult}
					<div class="flex items-center gap-4 px-4 py-3">
						<i
							class="fa-sharp-duotone fa-solid fa-shield-halved text-base-content/60 w-6 text-center text-lg"
						></i>
						<div class="flex flex-col">
							<span class="font-semibold">{m.guardianAgreement()}</span>
							<span class="text-base-content/60 text-sm">{m.guardianAgreementNotNeeded()}</span>
						</div>
					</div>
				{:else}
					<StatusRow
						title={m.guardianAgreement()}
						faIcon="shield-halved"
						active={status?.guardianConsent ?? 'PENDING'}
						options={administrativeOptions}
						change={(guardianConsent) => change({ guardianConsent })}
					/>
				{/if}
			{/if}
			<StatusRow
				title={m.mediaAgreement()}
				faIcon="camera"
				active={status?.mediaConsent ?? 'PENDING'}
				options={administrativeOptions}
				change={(mediaConsent) => change({ mediaConsent })}
			/>
			<StatusRow
				title={m.mediaConsentStatus()}
				faIcon="camera-slash"
				active={status?.mediaConsentStatus ?? 'NOT_SET'}
				options={mediaConsentOptions}
				change={(mediaConsentStatus) => change({ mediaConsentStatus })}
			/>
			<DocumentNumberRow
				assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
				onSave={(number) =>
					change({ assignedDocumentNumber: number, assignNextDocumentNumber: !number })}
			/>
		</div>
		{#if !status}
			<div class="alert alert-info">
				<i class="fa-sharp-duotone fa-solid fa-circle-info"></i>
				<span>{m.noParticipantStatusYet()}</span>
			</div>
		{/if}
	</section>

	<EmailLogSection {userId} {conferenceId} />
</div>
