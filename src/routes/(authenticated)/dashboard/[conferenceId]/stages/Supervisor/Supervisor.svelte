<script lang="ts">
	import codenamize from '$lib/services/codenamize';
	import type { PageData } from '../../$houdini';
	import { alpha3Code, m } from '$lib/paraglide/messages';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { cache, graphql, type MyConferenceparticipationQuery$result } from '$houdini';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import ConferenceStatusWidget from '../../ConferenceStatusWidget.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import getSimplifiedPostalStatus from '$lib/services/getSimplifiedPostalStatus';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import { page } from '$app/state';
	import EntryCode from '../Common/EntryCode.svelte';
	import SupervisorContentCard from './SupervisorContentCard.svelte';
	import InfoGrid from '$lib/components/InfoGrid';

	// TODO these components need some refactoring

	interface Props {
		user: PageData['user'];
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		supervisor: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueConferenceSupervisor']
		>;
		status: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueConferenceParticipantStatus']
		>;
		ofAge: boolean;
	}

	let { user, conference, supervisor, status, ofAge }: Props = $props();

	let isStateParticipantRegistration = $derived(conference.state === 'PARTICIPANT_REGISTRATION');
	let delegationMembers = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedDelegationMembers
			: supervisor.supervisedDelegationMembers.filter(
					(x) => x.delegation.assignedNation || x.delegation.assignedNonStateActor
				)
	);
	let delegations = $derived([
		...new Map(delegationMembers.map((x) => [x.delegation.id, x.delegation])).values()
	]);
	let singleParticipants = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedSingleParticipants
			: supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole)
	);

	let connectionLink = $derived(
		`${page.url.origin}/dashboard/${conference.id}/connectSupervisor?code=${supervisor.connectionCode}`
	);

	const stats = $derived([
		{
			icon: 'flag',
			title: m.delegations(),
			value: delegations.length,
			desc: m.inTheConference()
		},
		{
			icon: 'users',
			title: m.members(),
			value: delegations.reduce((acc, cur) => acc + cur.members.length, 0),
			desc: m.inAllDelegations()
		},
		{
			icon: 'users',
			title: m.singleParticipants(),
			value: singleParticipants.length,
			desc: m.singleParticipants()
		}
	]);

	const getName = (
		user: { given_name: string; family_name: string } & { [key: string]: any },
		shortenGiven = false
	) => {
		if (shortenGiven) {
			return `${user.given_name.charAt(0)}. ${user.family_name}`;
		}
		return formatNames(user.given_name, user.family_name);
	};

	const updateQuery = graphql(`
		mutation SupervisorAttendanceChangeMutation(
			$where: ConferenceSupervisorWhereUniqueInput!
			$data: ConferenceSupervisorUpdateDataInput!
		) {
			updateOneConferenceSupervisor(where: $where, data: $data) {
				id
				plansOwnAttendenceAtConference
			}
		}
	`);

	const handlePresenceChange = async (e: Event) => {
		await toast.promise(
			updateQuery.mutate({
				where: {
					conferenceId_userId: {
						conferenceId: conference.id,
						userId: user.sub
					}
				},
				data: {
					plansOwnAttendenceAtConference: (e.target as HTMLInputElement).checked
				}
			}),
			{
				loading: m.genericToastLoading(),
				success: m.genericToastSuccess(),
				error: m.genericToastError()
			}
		);

		cache.markStale();
		await invalidateAll();
	};

	// const allParticipants = $derived([...supervisor.supervisedSingleParticipants, ...supervisor.supervisedDelegationMembers].sort((a, b) => a.user.family_name.localeCompare(b.user.family_name)));

	const userQuery = graphql(`
		query GetUserDetailsForPostalRegistration($id: String!, $conferenceId: String!) {
			findUniqueUser(where: { id: $id }) {
				id
				given_name
				family_name
				street
				apartment
				zip
				city
				country
				birthday
			}

			findUniqueConference(where: { id: $conferenceId }) {
				id
				contractContent
				guardianConsentContent
				mediaConsentContent
				termsAndConditionsContent
			}
		}
	`);

	const downloadPostalDocuments = async (userId: string) => {
		try {
			const userDetailsStore = await userQuery.fetch({
				variables: { id: userId, conferenceId: conference!.id }
			});
			const user = userDetailsStore?.data?.findUniqueUser;
			const conferenceData = userDetailsStore?.data?.findUniqueConference;

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
					address: `${user.street} ${user.apartment ? user.apartment : ''}, ${user.zip} ${user.city}, ${user.country}`,
					birthday: user.birthday?.toLocaleDateString() ?? ''
				};

				await downloadCompletePostalRegistrationPDF(
					ofAgeAtConference(conference?.startConference, user.birthday ?? new Date()),
					participantData,
					recipientData,
					conferenceData?.contractContent ?? undefined,
					conferenceData?.guardianConsentContent ?? undefined,
					conferenceData?.mediaConsentContent ?? undefined,
					conferenceData?.termsAndConditionsContent ?? undefined,
					`${formatInitials(user.given_name, user.family_name)}_postal_registration.pdf`
				);
			} else {
				console.error('User details not found');
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
		}
	};

	const rotateConnectionCodeMutation = graphql(`
		mutation RotateSupervisorConnectionCode($id: ID!) {
			rotateSupervisorConnectionCode(id: $id) {
				id
				connectionCode
			}
		}
	`);
</script>

{#if isStateParticipantRegistration}
	<section class="alert alert-info">
		<i class="fa-solid fa-circle-info text-xl"></i>
		{m.registeredAsSupervisor()}
	</section>
{/if}

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.overview()}</h2>
	<GenericWidget content={stats} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.ownPresence()}</h2>
	<p class="text-sm">{m.ownPresenceDescription()}</p>
	<div class="card bg-base-100 dark:bg-base-200 max-w-80 p-6 shadow-md">
		<fieldset class="fieldset">
			<label class="label cursor-pointer">
				<span>{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={supervisor.plansOwnAttendenceAtConference}
					onchange={handlePresenceChange}
					disabled={!isStateParticipantRegistration}
				/>
			</label>
		</fieldset>
	</div>
	<p class="text-xs text-gray-500">
		{@html supervisor.plansOwnAttendenceAtConference
			? m.willBePresentAtConference()
			: m.willNotBePresentAtConference()}
	</p>
</section>

{#if !isStateParticipantRegistration}
	<ConferenceStatusWidget
		conferenceId={conference!.id}
		userId={user.sub}
		ofAgeAtConference={ofAge}
		{status}
		unlockPayment={conference?.unlockPayments}
		unlockPostals={conference?.unlockPostals}
	/>

	<TasksWrapper>
		{#if supervisor.supervisedDelegationMembers.some((x) => !x.assignedCommittee)}
			<TaskAlertCard
				severity="warning"
				faIcon="fa-arrows-turn-to-dots"
				title={m.committeeAssignment()}
				description={m.committeeAssignmentAlertDescriptionSupervisor()}
			/>
		{/if}
		{#if conference.info}
			<TaskAlertCard
				faIcon="fa-info"
				title={m.conferenceInfo()}
				description={m.conferenceInfoDescription()}
				btnText={m.goToConferenceInfo()}
				btnLink={`./${conference.id}/info`}
			/>
		{/if}
		{#if conference.linkToPreparationGuide}
			<TaskAlertCard
				faIcon="fa-book-bookmark"
				title={m.preparation()}
				description={m.preparationDescription()}
				btnText={m.goToPreparation()}
				btnLink={conference.linkToPreparationGuide}
				btnExternal
			/>
		{/if}
	</TasksWrapper>
{/if}

<!-- <section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.participantStatus()}</h2>
<DelegationStatusTableWrapper withPostalSatus withPaymentStatus>
		{#each allParticipants ?? [] as user}
			{@const participantStatus = user.conferenceParticipantStatus.find(
				(x) => x.conference.id === conference.id
			)}
			<DelegationStatusTableEntry
				name={formatNames(user.given_name, user.family_name)}
				pronouns={user.pronouns ?? ''}
				withPaymentStatus
				withPostalStatus
				downloadPostalDocuments={conference?.unlockPostals
					? () => downloadPostalDocuments(user.id)
					: undefined}
				paymentStatus={participantStatus?.paymentStatus ?? 'PENDING'}
				postalSatus={getSimplifiedPostalStatus(
					participantStatus,
					ofAgeAtConference(conference.startConference, user.birthday)
				)}
			/>
		{/each}
	</DelegationStatusTableWrapper>
</section> -->

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegations()}</h2>
	<p class="text-sm">{m.delegationsDescription()}</p>
	{#if delegations.length > 0}
		{#each delegations as delegation (delegation.id)}
			{@const members = delegationMembers.filter((x) => x.delegation.id === delegation.id)}
			{@const hiddenMembers = delegation.members.filter(
				(x) => !members.map((y) => y.id).includes(x.id)
			)}

			<SupervisorContentCard
				title={codenamize(delegation.id)}
				{isStateParticipantRegistration}
				applied={delegation.applied}
			>
				{#snippet detailSpace()}
					<InfoGrid.Grid>
						{#if isStateParticipantRegistration}
							<InfoGrid.Entry title={m.entryCode()} fontAwesomeIcon="fa-duotone fa-barcode">
								<span class="font-mono tracking-[0.3rem]">{delegation.entryCode}</span>
							</InfoGrid.Entry>
							<InfoGrid.Entry title={m.roleApplications()} fontAwesomeIcon="fa-duotone fa-flag">
								{#if delegation.appliedForRoles.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each delegation.appliedForRoles
											.sort((x) => x.rank)
											.reverse() as roleApplication (roleApplication.id)}
											<Flag
												size="xs"
												alpha2Code={roleApplication.nation?.alpha2Code}
												nsa={!!roleApplication.nonStateActor}
												icon={roleApplication.nonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
											/>
										{/each}
									</div>
								{:else}
									<i class="fa-duotone fa-dash"></i>
								{/if}
							</InfoGrid.Entry>
						{:else}
							<InfoGrid.Entry title={m.role()} fontAwesomeIcon="fa-duotone fa-flag">
								<Flag
									size="xs"
									alpha2Code={delegation.assignedNation?.alpha2Code}
									nsa={!!delegation.assignedNonStateActor}
									icon={delegation.assignedNonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
								/>
								{#if delegation.assignedNation}
									{getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)}
									({alpha3Code(delegation.assignedNation.alpha3Code)})
								{:else if delegation.assignedNonStateActor}
									{delegation.assignedNonStateActor.name}
								{/if}
							</InfoGrid.Entry>
						{/if}
						<InfoGrid.Entry
							title={m.delegationMembers()}
							fontAwesomeIcon="fa-duotone fa-users"
							content={delegation.members.length}
						/>
						<InfoGrid.Entry
							title={m.schoolOrInstitution()}
							fontAwesomeIcon="school"
							content={delegation.school}
						/>
						<InfoGrid.Entry
							title={m.experience()}
							fontAwesomeIcon="compass"
							content={delegation.experience}
						/>
						<InfoGrid.Entry
							title={m.motivation()}
							fontAwesomeIcon="fire-flame-curved"
							content={delegation.motivation}
						/>
					</InfoGrid.Grid>
				{/snippet}

				{#snippet memberSpace()}
					<DelegationStatusTableWrapper
						withPostalSatus={!isStateParticipantRegistration}
						withPaymentStatus={!isStateParticipantRegistration}
						withCommittee={!isStateParticipantRegistration}
						withEmail
						title={m.members()}
					>
						{#each members ?? [] as member (member.id)}
							{@const participantStatus = member.user?.conferenceParticipantStatus.find(
								(x) => x.conference.id === conference?.id
							)}
							<DelegationStatusTableEntry
								name={formatNames(member.user.given_name, member.user.family_name)}
								pronouns={member.user.pronouns ?? ''}
								headDelegate={member.isHeadDelegate}
								email={member.user.email}
								committee={!isStateParticipantRegistration
									? (member.assignedCommittee?.abbreviation ?? '')
									: undefined}
								withPaymentStatus={!isStateParticipantRegistration}
								withPostalStatus={!isStateParticipantRegistration}
								downloadPostalDocuments={conference?.unlockPostals
									? () => downloadPostalDocuments(member.user.id)
									: undefined}
								postalSatus={getSimplifiedPostalStatus(
									participantStatus,
									ofAgeAtConference(conference?.startConference, member.user.birthday)
								)}
								paymentStatus={participantStatus?.paymentStatus}
							/>
						{/each}
						{#each hiddenMembers as member (member.id)}
							<tr>
								<td colspan="5" class="text-gray-500 italic">
									{m.hiddenMember()}
									{#if member.isHeadDelegate}
										<div class="tooltip" data-tip={m.headDelegate()}>
											<i class="fa-duotone fa-medal ml-2"></i>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</DelegationStatusTableWrapper>
				{/snippet}
			</SupervisorContentCard>
		{/each}
	{:else}
		<div class="alert alert-warning">
			<i class="fa-solid fa-exclamation-triangle text-xl"></i>
			{m.noDelegationsFound()}
		</div>
	{/if}
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.singleParticipants()}</h2>

	{#if singleParticipants.length > 0}
		{#each singleParticipants as singleParticipant (singleParticipant.id)}
			<SupervisorContentCard
				title={formatNames(singleParticipant.user.given_name, singleParticipant.user.family_name)}
				{isStateParticipantRegistration}
				applied={singleParticipant.applied}
			>
				{#snippet detailSpace()}
					<InfoGrid.Grid>
						{#if !singleParticipant.assignedRole}
							<InfoGrid.Entry title={m.roleApplications()} fontAwesomeIcon="masks-theater">
								{#if singleParticipant.appliedForRoles.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each singleParticipant.appliedForRoles as roleApplication (roleApplication.id)}
											<div class="badge">
												<i
													class="fa-duotone fa-{roleApplication.fontAwesomeIcon?.replace(
														'fa-',
														''
													)} mr-2"
												></i>
												{roleApplication.name}
											</div>
										{/each}
									</div>
								{:else}
									<i class="fa-duotone fa-dash"></i>
								{/if}
							</InfoGrid.Entry>
						{:else}
							<InfoGrid.Entry title={m.role()} fontAwesomeIcon="masks-theater">
								<i
									class="fa-duotone fa-{singleParticipant.assignedRole?.fontAwesomeIcon?.replace(
										'fa-',
										''
									)}"
								></i>
								{singleParticipant.assignedRole?.name}
							</InfoGrid.Entry>
						{/if}
						<InfoGrid.Entry
							title={m.schoolOrInstitution()}
							content={singleParticipant.school}
							fontAwesomeIcon="school"
						/>
						<InfoGrid.Entry
							title={m.experience()}
							content={singleParticipant.experience}
							fontAwesomeIcon="compass"
						/>
						<InfoGrid.Entry
							title={m.motivation()}
							content={singleParticipant.motivation}
							fontAwesomeIcon="fire-flame-curved"
						/>
					</InfoGrid.Grid>
				{/snippet}

				{#snippet memberSpace()}
					<DelegationStatusTableWrapper
						withPostalSatus={!isStateParticipantRegistration}
						withPaymentStatus={!isStateParticipantRegistration}
						withEmail
						title={m.details()}
					>
						{@const participantStatus = singleParticipant.user?.conferenceParticipantStatus.find(
							(x) => x.conference.id === conference?.id
						)}
						<DelegationStatusTableEntry
							name={formatNames(
								singleParticipant.user.given_name,
								singleParticipant.user.family_name
							)}
							pronouns={singleParticipant.user.pronouns ?? ''}
							email={singleParticipant.user.email}
							withPaymentStatus={!isStateParticipantRegistration}
							withPostalStatus={!isStateParticipantRegistration}
							downloadPostalDocuments={conference?.unlockPostals
								? () => downloadPostalDocuments(singleParticipant.user.id)
								: undefined}
							postalSatus={getSimplifiedPostalStatus(
								participantStatus,
								ofAgeAtConference(conference?.startConference, singleParticipant.user.birthday)
							)}
							paymentStatus={participantStatus?.paymentStatus}
						/>
					</DelegationStatusTableWrapper>
				{/snippet}
			</SupervisorContentCard>
		{/each}
	{:else}
		<div class="alert alert-warning">
			<i class="fa-solid fa-exclamation-triangle text-xl"></i>
			{m.noSingleParticipantsFound()}
		</div>
	{/if}
</section>

<DashboardContentCard
	title={m.connectWithStudents()}
	description={m.connectWithStudentsDescription()}
>
	<EntryCode
		entryCode={supervisor.connectionCode}
		referralLink={connectionLink}
		userHasRotationPermission={true}
		rotationFn={async () => {
			await toast.promise(
				rotateConnectionCodeMutation.mutate({
					id: supervisor.id
				}),
				{
					loading: m.genericToastLoading(),
					success: m.codeRotated(),
					error: m.genericToastError()
				}
			);
			cache.markStale();
			await invalidateAll();
		}}
	/>
</DashboardContentCard>
