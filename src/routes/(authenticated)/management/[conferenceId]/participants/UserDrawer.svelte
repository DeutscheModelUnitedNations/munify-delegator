<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client, type MediaconsentstatusEnum, type Mutation } from '$lib/api/rumbleClient/client';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import StatusWidgetBoolean from '$lib/components/BooleanStatusWidget.svelte';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import formatNames from '$lib/helpers/formatNames';
	import SurveyCard from './SurveyCard.svelte';
	import GlobalNotes from './GlobalNotes.svelte';
	import ParticipantStatusMediaWidget from '$lib/components/ParticipantStatusMediaWidget.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/utils/pdfGenerator';
	import { toast } from 'svelte-sonner';
	import { configPublic } from '$config/public';
	import Modal from '$lib/components/Modal.svelte';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import ParticipantAssignedDocumentWidget from '$lib/components/ParticipantAssignedDocumentWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import AccessCardSection from './AccessCardSection.svelte';
	import AttendanceSection from './AttendanceSection.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { userId, conferenceId, open = $bindable(false), onClose }: Props = $props();

	let openGlobalNotes = $state(false);
	let assignedDocumentNumber = $state<number>();

	$effect(() => {
		if (userQuery?.status?.assignedDocumentNumber) {
			assignedDocumentNumber = userQuery.status.assignedDocumentNumber;
		}
	});

	let assignSupervisorModalOpen = $state(false);

	/** Everything the participant drawer shows, in one place. */
	async function fetchUserData(userId: string, conferenceId: string) {
		const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

		const [
			user,
			delegationMembers,
			supervisors,
			singleParticipants,
			statuses,
			surveyAnswers,
			surveys,
			conference
		] = await Promise.all([
			client.query.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				birthday: true,
				pronouns: true,
				phone: true,
				email: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				foodPreference: true,
				emergencyContacts: true,
				gender: true,
				globalNotes: true,
				conferenceParticipationsCount: true
			}),
			client.query.delegationMembers({
				__args: { where: forUser },
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true }
				},
				assignedCommittee: { abbreviation: true }
			}),
			client.query.conferenceSupervisors({ __args: { where: forUser }, id: true }),
			client.query.singleParticipants({ __args: { where: forUser }, id: true }),
			client.query.conferenceParticipantStatuses({
				__args: { where: forUser },
				id: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				mediaConsentStatus: true,
				paymentStatus: true,
				didAttend: true,
				assignedDocumentNumber: true,
				accessCardId: true,
				attendanceEntries: {
					id: true,
					timestamp: true,
					occasion: true,
					recordedBy: { id: true, givenName: true, familyName: true }
				}
			}),
			client.query.surveyAnswers({
				__args: {
					where: {
						userId: { eq: userId },
						question: { conferenceId: { eq: conferenceId } }
					}
				},
				id: true,
				question: { id: true, title: true },
				option: { id: true, title: true }
			}),
			client.query.surveyQuestions({
				__args: {
					where: { conferenceId: { eq: conferenceId }, hidden: { eq: false } }
				},
				id: true,
				title: true,
				options: { id: true, title: true, countSurveyAnswers: true, upperLimit: true }
			}),
			client.query.conference({
				__args: { id: conferenceId },
				startConference: true,
				postalName: true,
				postalStreet: true,
				postalApartment: true,
				postalZip: true,
				postalCity: true,
				postalCountry: true,
				nextDocumentNumber: true
			})
		]);

		return {
			user,
			delegationMembers,
			supervisors,
			singleParticipants,
			status: statuses.at(0) ?? null,
			surveyAnswers,
			surveys,
			conference
		};
	}

	let userQuery = $state<Awaited<ReturnType<typeof fetchUserData>>>();
	let userQueryLoading = $state(false);

	async function loadUserData() {
		userQueryLoading = true;
		try {
			userQuery = await fetchUserData(userId, conferenceId);
		} finally {
			userQueryLoading = false;
		}
	}

	$effect(() => {
		// Referenced so the effect re-runs when the drawer is pointed at someone else.
		void userId;
		void conferenceId;
		void loadUserData();
	});

	/** Every supervisor of the conference, for the "assign a supervisor" picker. */
	function fetchSupervisorList() {
		return client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			connectionCode: true,
			user: { id: true, givenName: true, familyName: true }
		});
	}

	let supervisorList = $state<Awaited<ReturnType<typeof fetchSupervisorList>>>();
	let supervisorListLoading = $state(false);

	let status = $derived(userQuery?.status);
	let surveys = $derived(userQuery?.surveys);
	let surveyAnswers = $derived(userQuery?.surveyAnswers);
	let user = $derived(userQuery?.user);
	let ofAge = $derived(ofAgeAtConference(userQuery?.conference?.startConference, user?.birthday));

	let loadingDownloadPostalDocuments = $state(false);
	let loadingDownloadCertificate = $state(false);

	/** The mutation's own argument type minus the identifying fields this drawer fills in. */
	type StatusChange = Omit<
		Parameters<Mutation['updateConferenceParticipantStatus']>[0],
		'conferenceId' | 'id' | 'userId'
	>;

	const changeAdministrativestatusEnum = async (change: StatusChange) => {
		await client.mutate.updateConferenceParticipantStatus({
			__args: { ...change, id: status?.id, conferenceId, userId },
			id: true
		});
		await loadUserData();
	};

	const changeMediaConsentStatus = async (mediaConsentStatus: MediaconsentstatusEnum) => {
		await changeAdministrativestatusEnum({ mediaConsentStatus });
	};

	const assigneSupervisor = async (connectionCode: string) => {
		const promise = client.mutate.connectToConferenceSupervisor({
			__args: { conferenceId, userId, connectionCode },
			id: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		assignSupervisorModalOpen = false;
	};

	const deleteParticipant = async () => {
		const c = confirm(m.deleteParticipantConfirm());
		if (!c) return;
		await client.mutate.unregisterParticipant({
			__args: { userId: user?.id ?? '', conferenceId },
			id: true
		});
		if (onClose) {
			onClose();
		}
	};

	const downloadPostalDocuments = async () => {
		loadingDownloadPostalDocuments = true;
		try {
			const conference = userQuery?.conference;

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
					name: formatNames(user.givenName, user.familyName, {
						givenNameFirst: true,
						familyNameUppercase: true,
						givenNameUppercase: true
					}),
					address: `${user.street} ${user.apartment ? user.apartment : ''}, ${user.zip} ${user.city}, ${user.country}`,
					birthday: user.birthday?.toLocaleDateString() ?? ''
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference?.startConference, user.birthday ?? new Date()),
					participantData,
					recipientData,
					baseContent.contractContent ?? undefined,
					baseContent.guardianConsentContent ?? undefined,
					baseContent.mediaConsentContent ?? undefined,
					baseContent.termsAndConditionsContent ?? undefined,
					`${formatNames(user.givenName, user.familyName, {
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

		const [certificateConference, jwtData] = await Promise.all([
			client.query.conference({ __args: { id: conferenceId }, certificateContent: true }),
			client.query.getCertificateJWT({
				__args: { conferenceId, userId: user?.id ?? '' },
				jwt: true,
				fullName: true
			})
		]);

		if (!jwtData?.fullName || !jwtData?.jwt) {
			toast.error(m.certificateDownloadError());
			return;
		}

		try {
			if (user) {
				await downloadCompleteCertificate(
					jwtData,
					certificateConference.certificateContent ?? undefined,
					`${formatNames(user.givenName, user.familyName, {
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

	$effect(() => {
		if (!assignSupervisorModalOpen) return;
		supervisorListLoading = true;
		void fetchSupervisorList()
			.then((supervisors) => {
				supervisorList = supervisors;
			})
			.finally(() => {
				supervisorListLoading = false;
			});
	});
</script>

{#snippet titleSnippet()}
	<span>
		{formatNames(user?.givenName, user?.familyName, { givenNameFirst: false })}
	</span>
	{#if user?.pronouns}
		<span class="text-sm font-normal">({user?.pronouns})</span>
	{/if}
{/snippet}

<Drawer
	bind:open
	{onClose}
	id={userId}
	category={m.adminUserCard()}
	{titleSnippet}
	loading={userQueryLoading}
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
					{#if user?.phone}
						<td class="font-mono">
							<a
								class="bg-base-300 cursor-pointer rounded-md px-2 py-1 hover:underline"
								href={`tel:${user?.phone}`}>{user?.phone}</a
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
							class="bg-base-300 cursor-pointer rounded-md px-2 py-1 hover:underline"
							href={`mailto:${user?.email}`}
						>
							{user?.email}
						</a>
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-house text-lg"></i></td>
					{#if user?.street}
						<td>
							{user?.street}
							<br />
							{#if user?.apartment}
								{user?.apartment}
								<br />
							{/if}
							{user?.zip}
							{user?.city}
							<br />
							<span class="uppercase"
								>{user?.country && user?.country !== '' ? user?.country : 'N/A'}</span
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td class="text-center text-lg">
						{#if user?.gender === 'FEMALE'}
							<i class="fa-duotone fa-venus"></i>
						{:else if user?.gender === 'MALE'}
							<i class="fa-duotone fa-mars"></i>
						{:else if user?.gender === 'DIVERSE'}
							<i class="fa-duotone fa-question"></i>
						{:else}
							<i class="fa-duotone fa-dash"></i>
						{/if}
					</td>
					<td>
						{user?.pronouns}
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
					{#if user?.foodPreference === 'OMNIVORE'}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>{m.omnivore()}</td>
					{:else if user?.foodPreference === 'VEGETARIAN'}
						<td><i class="fa-duotone fa-cheese-swiss text-lg"></i></td>
						<td>{m.vegetarian()}</td>
					{:else if user?.foodPreference === 'VEGAN'}
						<td><i class="fa-duotone fa-leaf text-lg"></i></td>
						<td>{m.vegan()}</td>
					{:else}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td><i class="fa-duotone fa-light-emergency-on text-lg"></i></td>
					{#if user?.emergencyContacts}
						<td class="whitespace-pre-wrap">{user?.emergencyContacts}</td>
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

			{#if user?.globalNotes}
				<div class="card bg-base-200">
					<div class="card-body whitespace-pre-wrap">
						{user?.globalNotes}
					</div>
				</div>
			{/if}
			<button class="btn" aria-label="open global Notes" onclick={() => (openGlobalNotes = true)}>
				<i class="fa-duotone fa-pencil"></i>
				{m.editGlobalNotes()}
			</button>

			<GlobalNotes
				globalNotes={user?.globalNotes ?? ''}
				bind:open={openGlobalNotes}
				id={user?.id}
				onSaved={loadUserData}
			/>
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<div class="card flex flex-col">
			<div class="flex flex-col gap-2">
				{#if userQuery?.singleParticipants && userQuery?.singleParticipants.length > 0 && userQuery?.singleParticipants[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/individuals?selected={userQuery.singleParticipants[0]
							.id}"
					>
						{m.individualApplication()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if userQuery?.delegationMembers && userQuery?.delegationMembers.length > 0 && userQuery?.delegationMembers[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/delegations?selected={userQuery.delegationMembers[0]
							.delegation.id}"
					>
						{m.delegation()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if userQuery?.supervisors && userQuery?.supervisors.length > 0 && userQuery?.supervisors[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/supervisors?selected={userQuery.supervisors[0].id}"
					>
						{m.supervisor()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{/if}

				<ImpersonationButton {userId} />

				<button class="btn" onclick={() => (assignSupervisorModalOpen = true)}>
					<i class="fa-duotone fa-chalkboard-user"></i>
					{m.assignSupervisor()}
				</button>

				<button
					class="btn {loadingDownloadPostalDocuments && 'btn-disabled'}"
					onclick={() => downloadPostalDocuments()}
				>
					<i class="fa-duotone fa-{loadingDownloadPostalDocuments ? 'spinner fa-spin' : 'download'}"
					></i>
					{m.postalRegistration()}
				</button>
				<button
					class="btn {(loadingDownloadCertificate || !status?.didAttend) && 'btn-disabled'}"
					onclick={() => downloadCertificate()}
				>
					<i class="fa-duotone fa-{loadingDownloadCertificate ? 'spinner fa-spin' : 'download'}"
					></i>
					{m.certificate()}
				</button>

				{#if configPublic.PUBLIC_BADGE_GENERATOR_URL}
					{@const delegationMember = userQuery?.delegationMembers?.[0]}
					{@const assignedNation = delegationMember?.delegation?.assignedNation}
					<button
						class="btn"
						onclick={async () => {
							const body: {
								name?: string;
								countryName?: string;
								countryAlpha2Code?: string;
								committee?: string;
								pronouns?: string;
								id?: string;
								mediaConsentStatus?: string;
							} = {};
							if (user?.givenName && user?.familyName) {
								body.name = `${user.givenName} ${user.familyName}`;
							}
							if (assignedNation?.alpha3Code) {
								body.countryName = getFullTranslatedCountryNameFromISO3Code(
									assignedNation.alpha3Code
								);
							}
							if (assignedNation?.alpha2Code) {
								body.countryAlpha2Code = assignedNation.alpha2Code;
							}
							if (delegationMember?.assignedCommittee?.abbreviation) {
								body.committee = delegationMember.assignedCommittee.abbreviation;
							}
							if (user?.pronouns) {
								body.pronouns = user.pronouns;
							}
							if (user?.id) {
								body.id = user.id;
							}
							if (status?.mediaConsentStatus) {
								body.mediaConsentStatus = status.mediaConsentStatus;
							}
							try {
								const res = await fetch(
									`${configPublic.PUBLIC_BADGE_GENERATOR_URL}/api/session/create`,
									{
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify(body)
									}
								);
								if (!res.ok) {
									const errorText = await res.text();
									console.error(`Badge generator API error (${res.status}): ${errorText}`);
									toast.error(m.genericToastError());
									return;
								}
								const data: unknown = await res.json();
								if (
									typeof data !== 'object' ||
									data === null ||
									!('url' in data) ||
									typeof (data as { url: unknown }).url !== 'string' ||
									(data as { url: string }).url.trim() === ''
								) {
									console.error('Badge generator returned invalid response:', data);
									toast.error(m.genericToastError());
									return;
								}
								const { url } = data as { url: string };
								window.open(url.replace('http://', 'https://'), '_blank');
							} catch (e) {
								console.error('Failed to open badge generator', e);
								toast.error(m.genericToastError());
							}
						}}
					>
						<i class="fa-duotone fa-id-badge"></i>
						{m.generateBadge()}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminUserCardStatus()}</h3>
		<div class="flex flex-col gap-2">
			<ParticipantStatusWidget
				title={m.payment()}
				faIcon="fa-money-bill-transfer"
				status={status?.paymentStatus ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await changeAdministrativestatusEnum({ paymentStatus: newStatus })}
			/>
			<ParticipantAssignedDocumentWidget
				assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
				onSave={async (number?: number) =>
					await changeAdministrativestatusEnum({
						assignedDocumentNumber: number,
						assignNextDocumentNumber: !number
					})}
				disabledShortcut
			/>
			<ParticipantStatusWidget
				title={m.userAgreement()}
				faIcon="fa-file-signature"
				status={status?.termsAndConditions ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await changeAdministrativestatusEnum({ termsAndConditions: newStatus })}
			/>
			{#if !ofAge}
				<ParticipantStatusWidget
					title={m.guardianAgreement()}
					faIcon="fa-family"
					status={status?.guardianConsent ?? 'PENDING'}
					changeStatus={async (newStatus: AdministrativestatusEnum) =>
						await changeAdministrativestatusEnum({ guardianConsent: newStatus })}
				/>
			{/if}
			<ParticipantStatusWidget
				title={m.mediaAgreement()}
				faIcon="fa-photo-film-music"
				status={status?.mediaConsent ?? 'PENDING'}
				changeStatus={async (newStatus: AdministrativestatusEnum) =>
					await changeAdministrativestatusEnum({ mediaConsent: newStatus })}
			/>
			<ParticipantStatusMediaWidget
				title={m.mediaConsentStatus()}
				status={status?.mediaConsentStatus ?? 'NOT_SET'}
				changeStatus={async (newStatus: MediaconsentstatusEnum) =>
					await changeMediaConsentStatus(newStatus)}
			/>
			<StatusWidgetBoolean
				title={m.attendance()}
				faIcon="fa-calendar-check"
				status={status?.didAttend ?? false}
				changeStatus={async (newStatus: boolean) =>
					changeAdministrativestatusEnum({ didAttend: newStatus })}
			/>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.accessAndAttendance()}</h3>
		<AccessCardSection
			accessCardId={status?.accessCardId}
			onSave={async (value) => await changeAdministrativestatusEnum({ accessCardId: value })}
		/>
		<AttendanceSection
			{userId}
			{conferenceId}
			entries={status?.attendanceEntries ?? []}
			onChanged={async () => {
				await loadUserData();
			}}
		/>
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

{#if assignSupervisorModalOpen}
	<Modal bind:open={assignSupervisorModalOpen} title={m.assignSupervisor()}>
		<div class="h-full max-h-[70vh] overflow-y-auto">
			<table class="table w-full">
				<thead>
					<tr>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if supervisorListLoading}
						{#each Array(3) as _, i}
							<tr>
								<td colspan="2"><div class="skeleton h-8 w-32"></div></td>
							</tr>
						{/each}
					{:else if supervisorList && supervisorList.length !== 0}
						{#each supervisorList.sort( (a, b) => `${a.user.familyName}${a.user.givenName}`.localeCompare(`${b.user.familyName}${b.user.givenName}`) ) as supervisor (supervisor.id)}
							<tr>
								<td>
									<button
										class="btn btn-sm"
										aria-label="Details"
										onclick={() => assigneSupervisor(supervisor.connectionCode)}
									>
										<i class="fa-duotone fa-plus"></i>
									</button>
								</td>
								<td>
									<span class="capitalize">{supervisor.user.givenName}</span>
									<span class="uppercase">{supervisor.user.familyName}</span>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="2">
								<div class="alert alert-info">
									<i class="fa-solid fa-user-slash"></i>
									{m.noSingleParticipantsFound()}
								</div>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</Modal>
{/if}
