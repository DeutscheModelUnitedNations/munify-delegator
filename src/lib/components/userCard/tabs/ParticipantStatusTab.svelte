<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client, type MediaconsentstatusEnum, type Mutation } from '$lib/api/rumbleClient/client';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import BooleanStatusWidget from '$lib/components/BooleanStatusWidget.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import ParticipantPaymentWidget from '$lib/components/ParticipantPaymentWidget.svelte';
	import AccessCardSection from '../AccessCardSection.svelte';
	import AttendanceSection from '../AttendanceSection.svelte';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import GuardianConsentNotNeeded from '$lib/components/GuardianConsentNotNeeded.svelte';
	import {
		downloadPostalRegistrationDocuments,
		fetchPostalRegistrationSources,
		formatPostalParticipantName
	} from '$lib/api/postalRegistrationSources';
	import {
		downloadCompleteCertificate,
		type ParticipantData,
		type RecipientData
	} from '$lib/utils/pdfGenerator';
	import formatNames from '$lib/helpers/formatNames';

	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor }: Props = $props();

	/** The status row plus the two dates that decide whether a guardian has to consent. */
	async function fetchStatus(userId: string, conferenceId: string) {
		const [statuses, user, conference] = await Promise.all([
			client.liveQuery.conferenceParticipantStatuses({
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
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	/** Everything the postal documents need is read when they are asked for, not kept live. */
	const downloadPostalDocs = async () => {
		try {
			const { user, conference } = await fetchPostalRegistrationSources(userId, conferenceId);

			if (
				!conference.postalName ||
				!conference.postalStreet ||
				!conference.postalZip ||
				!conference.postalCity ||
				!conference.postalCountry
			) {
				toast.error(m.httpGenericError());
				return;
			}

			if (!user.birthday) {
				toast.error(m.httpMissingRequiredData());
				return;
			}

			const recipientData: RecipientData = {
				name: `${conference.postalName}`,
				address: `${conference.postalStreet} ${conference.postalApartment ?? ''}`,
				zip: conference.postalZip.toString(),
				city: conference.postalCity,
				country: conference.postalCountry
			};

			const participantData: ParticipantData = {
				id: user.id,
				name: formatPostalParticipantName(user.givenName, user.familyName),
				address: [
					[user.street, user.apartment].filter(Boolean).join(' '),
					[user.zip, user.city].filter(Boolean).join(' '),
					user.country
				]
					.filter(Boolean)
					.join(', '),
				birthday: user.birthday.toLocaleDateString()
			};

			await downloadPostalRegistrationDocuments({
				conference,
				birthday: user.birthday,
				participant: participantData,
				recipient: recipientData,
				fileName: `${formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
					givenNameFirst: false,
					delimiter: '_'
				})}_postal_registration.pdf`
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
					certificateContent: true,
					title: true
				}),
				client.query.getCertificateJWT({
					__args: { conferenceId, userId },
					jwt: true,
					fullName: true
				}),
				client.query.user({ __args: { id: userId }, id: true, givenName: true, familyName: true })
			]);

			if (!jwtData?.fullName || !jwtData?.jwt) {
				toast.error(m.certificateDownloadError());
				return;
			}

			await downloadCompleteCertificate(
				jwtData,
				conferenceData.certificateContent ?? undefined,
				`${formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
					givenNameFirst: false,
					delimiter: '_'
				})}_certificate.pdf`
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
