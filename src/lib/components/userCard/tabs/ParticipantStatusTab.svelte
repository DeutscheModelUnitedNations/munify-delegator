<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { invalidateAll } from '$app/navigation';
	import { client, type MediaconsentstatusEnum, type Mutation } from '$lib/api/rumbleClient/client';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import BooleanStatusWidget from '$lib/components/BooleanStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import ParticipantPaymentWidget from '$lib/components/ParticipantPaymentWidget.svelte';
	import AccessCardSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AccessCardSection.svelte';
	import AttendanceSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AttendanceSection.svelte';
	import { toast } from 'svelte-sonner';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';
	import {
		downloadCompletePostalRegistrationPDF,
		downloadCompleteCertificate,
		type ParticipantData,
		type RecipientData
	} from '$lib/utils/pdfGenerator';
	import formatNames from '$lib/helpers/formatNames';

	type AdministrativeStatus = 'DONE' | 'PENDING' | 'PROBLEM';

	interface Props {
		status:
			| {
					id: string;
					paymentStatus?: string | null;
					termsAndConditions?: string | null;
					guardianConsent?: string | null;
					mediaConsent?: string | null;
					mediaConsentStatus?: MediaconsentstatusEnum | null;
					didAttend?: boolean | null;
					assignedDocumentNumber?: number | null;
					accessCardId?: string | null;
					attendanceEntries?: {
						id: string;
						timestamp: Date;
						occasion: string;
						recordedBy: { id: string; givenName: string | null; familyName: string | null };
					}[];
			  }
			| null
			| undefined;
		userId: string;
		conferenceId: string;
		user:
			| {
					id: string;
					givenName?: string | null;
					familyName?: string | null;
					street?: string | null;
					apartment?: string | null;
					zip?: string | null;
					city?: string | null;
					country?: string | null;
					birthday?: Date | null;
			  }
			| null
			| undefined;
		conference:
			| {
					id: string;
					startConference?: Date | null;
					endConference?: Date | null;
					title?: string | null;
					postalName?: string | null;
					postalStreet?: string | null;
					postalApartment?: string | null;
					postalZip?: string | null;
					postalCity?: string | null;
					postalCountry?: string | null;
			  }
			| null
			| undefined;
		birthday?: Date | null;
		isConferenceSupervisor: boolean;
		onUpdate?: () => void;
	}

	let {
		status,
		userId,
		conferenceId,
		user,
		conference,
		birthday,
		isConferenceSupervisor,
		onUpdate
	}: Props = $props();

	const isAdult = $derived(ofAgeAtConference(conference?.startConference, birthday));

	/** The mutation's own argument type minus the identifying fields this component fills in. */
	type StatusChange = Omit<
		Parameters<Mutation['updateConferenceParticipantStatus']>[0],
		'conferenceId'
	>;

	const changeAdministrativeStatus = async (input: StatusChange) => {
		const promise = client.mutate.updateConferenceParticipantStatus({
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
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		await invalidateAll();
		onUpdate?.();
	};

	const downloadPostalDocs = async () => {
		try {
			const baseContent = await client.query.conference({
				__args: { id: conferenceId },
				id: true,
				contractContent: true,
				guardianConsentContent: true,
				mediaConsentContent: true,
				termsAndConditionsContent: true
			});

			if (
				!conference?.postalName ||
				!conference?.postalStreet ||
				!conference?.postalZip ||
				!conference?.postalCity ||
				!conference?.postalCountry
			) {
				toast.error(m.httpGenericError());
				return;
			}

			if (user) {
				if (!user.birthday) {
					toast.error(m.httpMissingRequiredData());
					return;
				}

				const recipientData: RecipientData = {
					name: `${conference.postalName}`,
					address: `${conference.postalStreet} ${conference.postalApartment ?? ''}`,
					zip: conference.postalZip?.toString() ?? '',
					city: conference.postalCity ?? '',
					country: conference.postalCountry ?? ''
				};

				const participantData: ParticipantData = {
					id: user.id,
					name: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
						givenNameFirst: true,
						familyNameUppercase: true,
						givenNameUppercase: true
					}),
					address: [
						[user.street, user.apartment].filter(Boolean).join(' '),
						[user.zip, user.city].filter(Boolean).join(' '),
						user.country
					]
						.filter(Boolean)
						.join(', '),
					birthday: user.birthday.toLocaleDateString()
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference.startConference, user.birthday),
					participantData,
					recipientData,
					baseContent.contractContent ?? undefined,
					baseContent.guardianConsentContent ?? undefined,
					baseContent.mediaConsentContent ?? undefined,
					baseContent.termsAndConditionsContent ?? undefined,
					`${formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
						givenNameFirst: false,
						delimiter: '_'
					})}_postal_registration.pdf`
				);
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.httpGenericError());
		}
	};

	const downloadCertificate = async () => {
		try {
			const [conferenceData, jwtData] = await Promise.all([
				client.query.conference({
					__args: { id: conferenceId },
					certificateContent: true,
					title: true
				}),
				client.query.getCertificateJWT({
					__args: { conferenceId, userId },
					jwt: true,
					fullName: true
				})
			]);

			if (!jwtData?.fullName || !jwtData?.jwt) {
				toast.error(m.certificateDownloadError());
				return;
			}

			if (user) {
				await downloadCompleteCertificate(
					jwtData,
					conferenceData.certificateContent ?? undefined,
					`${formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
						givenNameFirst: false,
						delimiter: '_'
					})}_certificate.pdf`
				);
			}
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
				status={(status?.paymentStatus ?? 'PENDING') as AdministrativeStatus}
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
				status={(status?.termsAndConditions ?? 'PENDING') as AdministrativeStatus}
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
						status={(status?.guardianConsent ?? 'PENDING') as AdministrativeStatus}
						changeStatus={async (newStatus) =>
							await changeAdministrativeStatus({ guardianConsent: newStatus })}
					/>
				{/if}
			{/if}
			<ParticipantStatusWidget
				title={m.mediaAgreement()}
				faIcon="camera"
				status={(status?.mediaConsent ?? 'PENDING') as AdministrativeStatus}
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
				<i class="fa-solid fa-circle-info"></i>
				<span>{m.noParticipantStatusYet()}</span>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<div class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.accessAndAttendance()}</h3>
		<AccessCardSection
			accessCardId={status?.accessCardId}
			onSave={async (value) => await changeAdministrativeStatus({ accessCardId: value })}
		/>
		<AttendanceSection
			{userId}
			{conferenceId}
			entries={status?.attendanceEntries ?? []}
			onChanged={async () => {
				await invalidateAll();
				onUpdate?.();
			}}
		/>
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
				<i class="fa-duotone fa-file-pdf"></i>
				{m.postalRegistration()}
			</button>

			<button class="btn btn-sm" onclick={downloadCertificate}>
				<i class="fa-duotone fa-certificate"></i>
				{m.certificate()}
			</button>
		</div>
	</div>
</div>
