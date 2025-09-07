<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import {
		cache,
		graphql,
		type MediaConsentStatus$options,
		type UpdateConferenceParticipantStatusInput
	} from '$houdini';
	import type { UserDrawerQueryVariables } from './$houdini';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import StatusWidgetBoolean from '$lib/components/ParticipantStatusWidgetBoolean.svelte';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import SurveyCard from './SurveyCard.svelte';
	import { changeParticipantStatus } from '$lib/queries/changeParticipantStatusMutation';
	import GlobalNotes from './GlobalNotes.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import { getBaseDocumentsForPostal } from '$lib/queries/getBaseDocuments';
	import toast from 'svelte-french-toast';
	import { certificateQuery } from '$lib/queries/certificateQuery';
	import { configPublic } from '$config/public';
	interface Props {
		userId: string;
		conferenceId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { userId, conferenceId, open = $bindable(false), onClose }: Props = $props();

	let openGlobalNotes = $state(false);

	export const _UserDrawerQueryVariables: UserDrawerQueryVariables = () => {
		return {
			userId: userId,
			conferenceId
		};
	};

	const userQuery = graphql(`
		query UserDrawerQuery($userId: String!, $conferenceId: String!) @load {
			findUniqueUser(where: { id: $userId }) {
				id
				given_name
				family_name
				birthday
				pronouns
				phone
				email
				street
				apartment
				zip
				city
				country
				foodPreference
				emergencyContacts
				gender
				globalNotes
			}
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				delegation {
					id
				}
			}
			findManyConferenceSupervisors(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
			}
			findUniqueConferenceParticipantStatus(
				where: { userId_conferenceId: { conferenceId: $conferenceId, userId: $userId } }
			) {
				id
				termsAndConditions
				guardianConsent
				mediaConsent
				mediaConsentStatus
				paymentStatus
				didAttend
			}
			findManySurveyAnswers(
				where: {
					userId: { equals: $userId }
					question: { conferenceId: { equals: $conferenceId } }
				}
			) {
				id
				question {
					id
					title
				}
				option {
					id
					title
				}
			}
			findManySurveyQuestions(
				where: { conferenceId: { equals: $conferenceId }, draft: { equals: false } }
			) {
				id
				title
				options {
					id
					title
					countSurveyAnswers
					upperLimit
				}
			}
			findUniqueConference(where: { id: $conferenceId }) {
				startConference
				postalName
				postalStreet
				postalApartment
				postalZip
				postalCity
				postalCountry
			}
		}
	`);

	let status = $derived($userQuery?.data?.findUniqueConferenceParticipantStatus);
	let surveys = $derived($userQuery?.data?.findManySurveyQuestions);
	let surveyAnswers = $derived($userQuery?.data?.findManySurveyAnswers);
	let user = $derived($userQuery?.data?.findUniqueUser);
	let ofAge = $derived(
		ofAgeAtConference($userQuery?.data?.findUniqueConference?.startConference, user?.birthday)
	);

	let loadingDownloadPostalDocuments = $state(false);
	let loadingDownloadCertificate = $state(false);

	const changeAdministrativeStatus = async (data: UpdateConferenceParticipantStatusInput) => {
		await changeParticipantStatus.mutate({
			where: { id: status?.id, conferenceId: conferenceId, userId: userId },
			data
		});
		cache.markStale();
		userQuery.fetch();
	};

	const changeMediaConsentStatus = async (data: MediaConsentStatus$options) => {
		await changeParticipantStatus.mutate({
			where: { id: status?.id, conferenceId: conferenceId, userId: user?.id },
			data: { mediaConsentStatus: data }
		});
		cache.markStale();
		userQuery.fetch();
	};

	const deleteParticipantQuery = graphql(`
		mutation deleteParticipantMutation($userId: ID!, $conferenceId: ID!) {
			unregisterParticipant(userId: $userId, conferenceId: $conferenceId) {
				id
			}
		}
	`);

	const deleteParticipant = async () => {
		const c = confirm(m.deleteParticipantConfirm());
		if (!c) return;
		await deleteParticipantQuery.mutate({
			userId: user?.id ?? '',
			conferenceId
		});
		if (onClose) {
			onClose();
		}
	};

	const downloadPostalDocuments = async () => {
		loadingDownloadPostalDocuments = true;
		try {
			const conference = $userQuery?.data?.findUniqueConference;

			const baseContent = await getBaseDocumentsForPostal.fetch({
				variables: {
					conferenceId
				}
			});

			if (baseContent.errors) {
				toast.error(m.httpGenericError());
			}

			if (
				!conference?.postalName ||
				!conference?.postalStreet ||
				!conference?.postalZip ||
				!conference?.postalCity ||
				!conference?.postalCountry
			) {
				toast.error('Missing postal information for the conference');
				return;
			}

			if (user) {
				const recipientData: RecipientData = {
					name: `${conference?.postalName}`,
					address: `${conference?.postalStreet} ${conference?.postalApartment ? conference?.postalApartment : ''}`,
					zip: conference?.postalZip?.toString() ?? '',
					city: conference?.postalCity ?? '',
					country: conference?.postalCountry ?? ''
				};

				const participantData: ParticipantData = {
					id: user.id,
					name: formatNames(user.given_name, user.family_name, {
						givenNameFirst: true,
						familyNameUppercase: true,
						givenNameUppercase: true
					}),
					address: `${$userQuery.data?.findUniqueUser?.street} ${$userQuery.data?.findUniqueUser?.apartment ? $userQuery.data?.findUniqueUser?.apartment : ''}, ${$userQuery.data?.findUniqueUser?.zip} ${$userQuery.data?.findUniqueUser?.city}, ${$userQuery.data?.findUniqueUser?.country}`,
					birthday: user.birthday?.toLocaleDateString() ?? ''
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference?.startConference, user.birthday ?? new Date()),
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
			} else {
				console.error('User details not found');
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			loadingDownloadPostalDocuments = false;
		}
	};

	const downloadCertificate = async () => {
		loadingDownloadCertificate = true;

		const certificateData = await certificateQuery.fetch({
			variables: {
				conferenceId,
				userId: user?.id ?? ''
			}
		});

		console.log(certificateData);
		const jwtData = certificateData.data?.getCertificateJWT;

		if (!jwtData?.fullName || !jwtData?.jwt) {
			toast.error(m.certificateDownloadError());
			return;
		}

		try {
			if (user) {
				await downloadCompleteCertificate(
					jwtData,
					certificateData.data?.findUniqueConference?.certificateContent ?? undefined,
					`${formatNames(user.given_name, user.family_name, {
						givenNameFirst: false,
						delimiter: '_'
					})}_certificate.pdf`
				);
			} else {
				console.error('User details not found');
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			loadingDownloadCertificate = false;
		}
	};
</script>

{#snippet titleSnippet()}
	<span>
		{formatNames(
			$userQuery.data?.findUniqueUser?.given_name,
			$userQuery.data?.findUniqueUser?.family_name,
			{ givenNameFirst: false }
		)}
	</span>
	{#if $userQuery.data?.findUniqueUser?.pronouns}
		<span class="text-sm font-normal">({$userQuery.data?.findUniqueUser?.pronouns})</span>
	{/if}
{/snippet}

<Drawer
	bind:open
	{onClose}
	id={userId}
	category={m.adminUserCard()}
	{titleSnippet}
	loading={$userQuery.fetching}
>
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-phone text-lg"></i></td>
					{#if $userQuery.data?.findUniqueUser?.phone}
						<td class="font-mono">
							<a
								class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
								href={`tel:${$userQuery.data?.findUniqueUser?.phone}`}
								>{$userQuery.data?.findUniqueUser?.phone}</a
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-envelope text-lg"></i></td>
					<td class="font-mono">
						<a
							class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
							href={`mailto:${$userQuery.data?.findUniqueUser?.email}`}
						>
							{$userQuery.data?.findUniqueUser?.email}
						</a>
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-house text-lg"></i></td>
					{#if $userQuery.data?.findUniqueUser?.street}
						<td>
							{$userQuery.data?.findUniqueUser?.street}
							<br />
							{#if $userQuery.data?.findUniqueUser?.apartment}
								{$userQuery.data?.findUniqueUser?.apartment}
								<br />
							{/if}
							{$userQuery.data?.findUniqueUser?.zip}
							{$userQuery.data?.findUniqueUser?.city}
							<br />
							<span class="uppercase"
								>{$userQuery.data?.findUniqueUser?.country &&
								$userQuery.data?.findUniqueUser?.country !== ''
									? $userQuery.data?.findUniqueUser?.country
									: 'N/A'}</span
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td class="text-center text-lg">
						{#if $userQuery.data?.findUniqueUser?.gender === 'FEMALE'}
							<i class="fa-duotone fa-venus"></i>
						{:else if $userQuery.data?.findUniqueUser?.gender === 'MALE'}
							<i class="fa-duotone fa-mars"></i>
						{:else if $userQuery.data?.findUniqueUser?.gender === 'DIVERSE'}
							<i class="fa-duotone fa-question"></i>
						{:else}
							<i class="fa-duotone fa-dash"></i>
						{/if}
					</td>
					<td>
						{$userQuery.data?.findUniqueUser?.pronouns}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-birthday-cake text-lg"></i></td>
					{#if user?.birthday}
						<td>
							{new Date(user!.birthday!).toLocaleDateString('de', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					{#if $userQuery.data?.findUniqueUser?.foodPreference === 'OMNIVORE'}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>{m.omnivore()}</td>
					{:else if $userQuery.data?.findUniqueUser?.foodPreference === 'VEGETARIAN'}
						<td><i class="fa-duotone fa-cheese-swiss text-lg"></i></td>
						<td>{m.vegetarian()}</td>
					{:else if $userQuery.data?.findUniqueUser?.foodPreference === 'VEGAN'}
						<td><i class="fa-duotone fa-leaf text-lg"></i></td>
						<td>{m.vegan()}</td>
					{:else}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td><i class="fa-duotone fa-light-emergency-on text-lg"></i></td>
					{#if $userQuery.data?.findUniqueUser?.emergencyContacts}
						<td class="whitespace-pre-wrap">{$userQuery.data?.findUniqueUser?.emergencyContacts}</td
						>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
			</tbody>
		</table>
	</div>

	{#if configPublic.PUBLIC_GLOBAL_USER_NOTES_ACTIVE}
		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-bold">{m.globalNotes()}</h3>
			<p class="text-sm">{m.globalNotesDescription()}</p>

			{#if $userQuery.data?.findUniqueUser?.globalNotes}
				<div class="card bg-base-200">
					<div class="card-body whitespace-pre-wrap">
						{$userQuery.data.findUniqueUser?.globalNotes}
					</div>
				</div>
			{/if}
			<button class="btn" aria-label="open global Notes" onclick={() => (openGlobalNotes = true)}>
				<i class="fa-duotone fa-pencil"></i>
				{m.editGlobalNotes()}
			</button>

			<GlobalNotes
				globalNotes={$userQuery.data?.findUniqueUser?.globalNotes ?? ''}
				bind:open={openGlobalNotes}
				id={$userQuery.data?.findUniqueUser?.id}
			/>
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<div class="card flex flex-col">
			<div class="flex flex-col gap-2">
				{#if $userQuery.data?.findManySingleParticipants && $userQuery.data?.findManySingleParticipants.length > 0 && $userQuery.data?.findManySingleParticipants[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/individuals?selected={$userQuery.data
							?.findManySingleParticipants[0].id}"
					>
						{m.individualApplication()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if $userQuery.data?.findManyDelegationMembers && $userQuery.data?.findManyDelegationMembers.length > 0 && $userQuery.data?.findManyDelegationMembers[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/delegations?selected={$userQuery.data
							?.findManyDelegationMembers[0].delegation.id}"
					>
						{m.delegation()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if $userQuery.data?.findManyConferenceSupervisors && $userQuery.data?.findManyConferenceSupervisors.length > 0 && $userQuery.data?.findManyConferenceSupervisors[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/supervisors?selected={$userQuery.data
							?.findManyConferenceSupervisors[0].id}"
					>
						{m.supervisor()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{/if}
				<button
					class="btn {loadingDownloadPostalDocuments && 'btn-disabled'}"
					onclick={() => downloadPostalDocuments()}
				>
					<i class="fa-duotone fa-{loadingDownloadPostalDocuments ? 'spinner fa-spin' : 'download'}"
					></i>
					{m.postalRegistration()}
				</button>
				<button
					class="btn {(loadingDownloadCertificate ||
						!$userQuery.data?.findUniqueConferenceParticipantStatus?.didAttend) &&
						'btn-disabled'}"
					onclick={() => downloadCertificate()}
				>
					<i class="fa-duotone fa-{loadingDownloadCertificate ? 'spinner fa-spin' : 'download'}"
					></i>
					{m.certificate()}
				</button>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminUserCardStatus()}</h3>
		<div class="flex flex-col gap-2">
			<ParticipantStatusWidget
				title={m.payment()}
				faIcon="fa-money-bill-transfer"
				status={$userQuery.data?.findUniqueConferenceParticipantStatus?.paymentStatus ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativeStatus) =>
					await changeAdministrativeStatus({ paymentStatus: newStatus })}
			/>
			<ParticipantStatusWidget
				title={m.userAgreement()}
				faIcon="fa-file-signature"
				status={$userQuery.data?.findUniqueConferenceParticipantStatus?.termsAndConditions ??
					'PENDING'}
				changeStatus={async (newStatus: AdministrativeStatus) =>
					await changeAdministrativeStatus({ termsAndConditions: newStatus })}
			/>
			{#if !ofAge}
				<ParticipantStatusWidget
					title={m.guardianAgreement()}
					faIcon="fa-family"
					status={$userQuery.data?.findUniqueConferenceParticipantStatus?.guardianConsent ??
						'PENDING'}
					changeStatus={async (newStatus: AdministrativeStatus) =>
						await changeAdministrativeStatus({ guardianConsent: newStatus })}
				/>
			{/if}
			<ParticipantStatusWidget
				title={m.mediaAgreement()}
				faIcon="fa-photo-film-music"
				status={$userQuery.data?.findUniqueConferenceParticipantStatus?.mediaConsent ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativeStatus) =>
					await changeAdministrativeStatus({ mediaConsent: newStatus })}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={$userQuery.data?.findUniqueConferenceParticipantStatus?.mediaConsentStatus ??
					'NOT_SET'}
				changeStatus={async (newStatus: MediaConsentStatus$options) =>
					await changeMediaConsentStatus(newStatus)}
			/>
			<StatusWidgetBoolean
				title={m.attendance()}
				faIcon="fa-calendar-check"
				status={$userQuery.data?.findUniqueConferenceParticipantStatus?.didAttend ?? false}
				changeStatus={async (newStatus: boolean) =>
					changeAdministrativeStatus({ didAttend: newStatus })}
			/>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.survey()}</h3>
		{#each surveys ?? [] as survey}
			<SurveyCard
				{survey}
				surveyAnswer={surveyAnswers?.find((a) => a.question.id === survey.id)}
				{conferenceId}
				{userId}
			/>
		{/each}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<div class="card flex flex-col">
			<div class="flex flex-col gap-2">
				<button class="btn btn-error" onclick={() => deleteParticipant()}>
					{m.deleteParticipant()}
					<i class="fas fa-trash"></i>
				</button>
			</div>
		</div>
	</div>
</Drawer>
