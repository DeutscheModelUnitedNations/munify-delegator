<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import {
		type UpdateConferenceParticipantStatusInput,
		type MediaConsentStatus$options
	} from '$houdini';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import BooleanStatusWidget from '$lib/components/BooleanStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import AccessCardSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AccessCardSection.svelte';
	import AttendanceSection from '../../../../routes/(authenticated)/management/[conferenceId]/participants/AttendanceSection.svelte';
	import { toast } from 'svelte-sonner';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import { certificateQuery } from '$lib/queries/certificateQuery';
	import { getBaseDocumentsForPostal } from '$lib/queries/getBaseDocuments';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';
	import {
		downloadCompletePostalRegistrationPDF,
		downloadCompleteCertificate,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import formatNames from '$lib/services/formatNames';

	type AdministrativeStatus = 'DONE' | 'PENDING' | 'PROBLEM';

	interface Props {
		status:
			| {
					id: string;
					paymentStatus?: string | null;
					termsAndConditions?: string | null;
					guardianConsent?: string | null;
					mediaConsent?: string | null;
					mediaConsentStatus?: MediaConsentStatus$options | null;
					didAttend?: boolean | null;
					assignedDocumentNumber?: number | null;
					accessCardId?: string | null;
					attendanceEntries?: {
						id: string;
						timestamp: Date;
						occasion: string;
						recordedBy: { id: string; given_name: string; family_name: string };
					}[];
			  }
			| null
			| undefined;
		userId: string;
		conferenceId: string;
		user:
			| {
					id: string;
					given_name?: string | null;
					family_name?: string | null;
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
					startConference?: string | null;
					endConference?: string | null;
					title?: string | null;
					postalName?: string | null;
					postalStreet?: string | null;
					postalApartment?: string | null;
					postalZip?: number | null;
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

	const changeAdministrativeStatus = async (input: UpdateConferenceParticipantStatusInput) => {
		const promise = changeParticipantStatus.mutate({
			where: { id: status?.id, conferenceId, userId },
			data: input
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		cache.markStale();
		await invalidateAll();
		onUpdate?.();
	};

	const downloadPostalDocs = async () => {
		try {
			const baseContent = await getBaseDocumentsForPostal.fetch({
				variables: { conferenceId }
			});

			if (baseContent.errors) {
				toast.error(m.httpGenericError());
				return;
			}

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
				const recipientData: RecipientData = {
					name: `${conference.postalName}`,
					address: `${conference.postalStreet} ${conference.postalApartment ?? ''}`,
					zip: conference.postalZip?.toString() ?? '',
					city: conference.postalCity ?? '',
					country: conference.postalCountry ?? ''
				};

				const participantData: ParticipantData = {
					id: user.id,
					name: formatNames(user.given_name, user.family_name, {
						givenNameFirst: true,
						familyNameUppercase: true,
						givenNameUppercase: true
					}),
					address: `${user.street} ${user.apartment ?? ''}, ${user.zip} ${user.city}, ${user.country}`,
					birthday: user.birthday?.toLocaleDateString() ?? ''
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference.startConference, user.birthday ?? new Date()),
					participantData,
					recipientData,
					baseContent.data?.findUniqueConference?.contractContent ?? undefined,
					baseContent.data?.findUniqueConference?.guardianConsentContent ?? undefined,
					baseContent.data?.findUniqueConference?.mediaConsentContent ?? undefined,
					baseContent.data?.findUniqueConference?.termsAndConditionsContent ?? undefined,
					`${formatNames(user.given_name, user.family_name, {
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
			const certificateData = await certificateQuery.fetch({
				variables: { conferenceId, userId }
			});

			const jwtData = certificateData.data?.getCertificateJWT;

			if (!jwtData?.fullName || !jwtData?.jwt) {
				toast.error(m.certificateDownloadError());
				return;
			}

			if (user) {
				await downloadCompleteCertificate(
					jwtData,
					certificateData.data?.findUniqueConference?.certificateContent ?? undefined,
					`${formatNames(user.given_name, user.family_name, {
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
				changeStatus={async (newStatus: MediaConsentStatus$options) =>
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
				cache.markStale();
				await invalidateAll();
				onUpdate?.();
			}}
		/>
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
