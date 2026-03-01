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
		conference:
			| {
					id: string;
					startConference?: string | null;
					endConference?: string | null;
					title?: string | null;
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
			const result = await getBaseDocumentsForPostal.fetch({
				variables: { visitorId: userId, conferenceId }
			});
			if (result.data?.postalRegistrationPDF) {
				const a = document.createElement('a');
				a.href = `data:application/pdf;base64,${result.data.postalRegistrationPDF}`;
				a.download = `postal-registration-${userId}.pdf`;
				a.click();
			}
		} catch {
			toast.error(m.httpGenericError());
		}
	};

	const downloadCertificate = async () => {
		try {
			const result = await certificateQuery.fetch({
				variables: { visitorId: userId, conferenceId }
			});
			if (result.data?.certificate) {
				const a = document.createElement('a');
				a.href = `data:application/pdf;base64,${result.data.certificate}`;
				a.download = `certificate-${userId}.pdf`;
				a.click();
			} else {
				toast.error(m.certificateDownloadError());
			}
		} catch {
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
			onChanged={() => {
				cache.markStale();
				invalidateAll();
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
