<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import {
		client,
		type MediaconsentstatusEnum,
		type Mutation
	} from '#lib/api/rumbleClient/client.js';
	import ParticipantStatusWidget from '#lib/components/ParticipantStatusWidget.svelte';
	import BooleanStatusWidget from '#lib/components/BooleanStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '#lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '#lib/components/ParticipantAssignedDocumentWidget.svelte';
	import ParticipantPaymentWidget from '#lib/components/ParticipantPaymentWidget.svelte';
	import AccessCardSection from '../AccessCardSection.svelte';
	import AttendanceSection from '../AttendanceSection.svelte';
	import ParticipantSchoolSection from '../ParticipantSchoolSection.svelte';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { toast } from 'svelte-sonner';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker.js';
	import GuardianConsentNotNeeded from '#lib/components/GuardianConsentNotNeeded.svelte';
	import {
		downloadPostalRegistrationDocuments,
		fetchPostalRegistrationSources
	} from '#lib/api/postalRegistrationSources.js';
	import { postalRecipient } from '#lib/api/postalRegistrationData.js';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator.js';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout.js';
	import {
		careTeamPostalParticipant,
		certificateContentsOf,
		documentFileName,
		hasPostalAddress
	} from './statusDownloads';

	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor }: Props = $props();

	/** The status row plus the two dates that decide whether a guardian has to consent. */
	async function fetchStatus(userId: string, conferenceId: string) {
		const [statuses, user, conference] = await Promise.all([
			client.liveQuery.conferenceParticipants({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
				id: true,
				paymentStatus: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				mediaConsentStatus: true,
				didAttend: true,
				assignedDocumentNumber: true,
				accessCardId: true
			}),
			client.liveQuery.user({ __args: { id: userId }, id: true, birthday: true }),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, startConference: true })
		]);
		return { statuses, user, conference };
	}

	const data = $derived(await fetchStatus(userId, conferenceId));
	const status = $derived(data.statuses.at(0));

	const isAdult = $derived(ofAgeAtConference(data.conference.startConference, data.user.birthday));

	/** The mutation's own argument type minus the identifying fields this component fills in. */
	type StatusChange = Omit<Parameters<Mutation['updateConferenceParticipant']>[0], 'conferenceId'>;

	const changeAdministrativeStatus = async (input: StatusChange) => {
		const promise = client.mutate.updateConferenceParticipant({
			__args: { ...input, id: status?.id, conferenceId, userId },
			id: true,
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			paymentStatus: true,
			didAttend: true,
			assignedDocumentNumber: true,
			accessCardId: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

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

	const downloadCertificate = async () => {
		try {
			const [conferenceData, jwtData, user] = await Promise.all([
				client.query.conference({
					__args: { id: conferenceId },
					certificateFile: { url: true },
					documentLayouts: true,
					title: true
				}),
				client.query.getCertificateJWT({
					__args: { conferenceId, userId },
					jwt: true,
					fullName: true,
					sessions: { name: true, attended: true }
				}),
				client.query.user({ __args: { id: userId }, id: true, givenName: true, familyName: true })
			]);
			const certificate = certificateContentsOf(jwtData);
			if (!certificate) {
				toast.error(m.certificateDownloadError());
				return;
			}
			await downloadCompleteCertificate(
				certificate,
				conferenceData.certificateFile?.url,
				documentFileName(user, 'certificate'),
				resolveDocumentLayout('certificate', conferenceData.documentLayouts)
			);
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.certificateDownloadError());
		}
	};
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.adminUserCardStatus()}</h3>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<ParticipantStatusWidget
				title={m.payment()}
				faIcon="money-bill"
				status={status?.paymentStatus ?? 'PENDING'}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ paymentStatus: newStatus })}
			/>
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
				onSave={async (number?: number) =>
					await changeAdministrativeStatus({
						assignedDocumentNumber: number,
						assignNextDocumentNumber: !number
					})}
				disabledShortcut
			/>
			<ParticipantStatusWidget
				title={m.userAgreement()}
				faIcon="file-signature"
				status={status?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ termsAndConditions: newStatus })}
			/>
			{#if !isConferenceSupervisor}
				{#if isAdult}
					<GuardianConsentNotNeeded />
				{:else}
					<ParticipantStatusWidget
						title={m.guardianAgreement()}
						faIcon="shield-halved"
						status={status?.guardianConsent ?? 'PENDING'}
						changeStatus={async (newStatus) =>
							await changeAdministrativeStatus({ guardianConsent: newStatus })}
					/>
				{/if}
			{/if}
			<ParticipantStatusWidget
				title={m.mediaAgreement()}
				faIcon="camera"
				status={status?.mediaConsent ?? 'PENDING'}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ mediaConsent: newStatus })}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={status?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaconsentstatusEnum) =>
					await changeAdministrativeStatus({ mediaConsentStatus: newStatus })}
			/>
			<BooleanStatusWidget
				title={m.attendance()}
				faIcon="calendar-check"
				status={status?.didAttend ?? false}
				changeStatus={async (newStatus) =>
					await changeAdministrativeStatus({ didAttend: newStatus })}
			/>
		</div>
		{#if !status}
			<div class="alert alert-info">
				<i class="fa-sharp-duotone fa-solid fa-circle-info"></i>
				<span>{m.noParticipantStatusYet()}</span>
			</div>
		{/if}
		<ParticipantSchoolSection {userId} {conferenceId} />
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.accessAndAttendance()}</h3>
		<AccessCardSection
			accessCardId={status?.accessCardId}
			onSave={async (value) => await changeAdministrativeStatus({ accessCardId: value })}
		/>
		<AttendanceSection {userId} {conferenceId} />
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.payment()}</h3>
		<ParticipantPaymentWidget {userId} {conferenceId} />
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.adminActions()}</h3>
		<div class="flex flex-wrap gap-2">
			<button class="btn btn-sm" onclick={downloadPostalDocs}>
				<i class="fa-sharp-duotone fa-solid fa-file-pdf"></i>
				{m.postalRegistration()}
			</button>

			<button class="btn btn-sm" onclick={downloadCertificate}>
				<i class="fa-sharp-duotone fa-solid fa-certificate"></i>
				{m.certificate()}
			</button>
		</div>
	</div>
</div>
