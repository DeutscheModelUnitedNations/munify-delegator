<script lang="ts">
	import type { PageData } from '../$houdini';
	import { m } from '$lib/paraglide/messages';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { graphql, type MyConferenceparticipationQuery$result } from '$houdini';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import ConferenceStatusWidget from '../ConferenceStatusWidget.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import type { AdministrativeStatus } from '@prisma/client';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import getSimplifiedPostalStatus from '$lib/services/getSimplifiedPostalStatus';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';

	// TODO these components need some refactoring
	let {
		user,
		conferenceData,
		ofAge
	}: {
		user: PageData['user'];
		conferenceData: MyConferenceparticipationQuery$result;
		ofAge: boolean;
	} = $props();

	let conference = $derived(conferenceData.findUniqueConference!);
	let supervisor = $derived(conferenceData.findUniqueConferenceSupervisor!);
	let delegations = $derived(
		conference.state === 'PARTICIPANT_REGISTRATION'
			? supervisor.delegations
			: supervisor.delegations.filter((x) => x.assignedNation || x.assignedNonStateActor)
	);
	let status = $derived(conferenceData.findUniqueConferenceParticipantStatus);

	const stats = $derived([
		{
			icon: 'flag',
			title: m.delegations(),
			value: supervisor.delegations.length,
			desc: m.inTheConference()
		},
		{
			icon: 'users',
			title: m.members(),
			value: supervisor.delegations.reduce((acc, cur) => acc + cur.members.length, 0),
			desc: m.inAllDelegations()
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
		await updateQuery.mutate({
			where: {
				conferenceId_userId: {
					conferenceId: conference.id,
					userId: user.sub
				}
			},
			data: {
				plansOwnAttendenceAtConference: (e.target as HTMLInputElement).checked
			}
		});
		//TODO does not update the UI after fetching
	};

	const allParticipants = $derived(
		supervisor.delegations
			.flatMap((x) => x.members.map((y) => y.user))
			.sort((a, b) => a.family_name.localeCompare(b.family_name))
	);

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
</script>

{#if conference.state === 'PARTICIPANT_REGISTRATION'}
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
	<div class="card max-w-80 bg-base-100 p-6 shadow-md dark:bg-base-200">
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={supervisor.plansOwnAttendenceAtConference}
					onchange={handlePresenceChange}
					disabled={conference.state !== 'PARTICIPANT_REGISTRATION'}
				/>
			</label>
		</div>
	</div>
	<p class="text-xs text-gray-500">
		{@html supervisor.plansOwnAttendenceAtConference
			? m.willBePresentAtConference()
			: m.willNotBePresentAtConference()}
	</p>
</section>

{#if conference.state !== 'PARTICIPANT_REGISTRATION'}
	<ConferenceStatusWidget
		conferenceId={conference!.id}
		userId={user.sub}
		ofAgeAtConference={ofAge}
		{status}
		unlockPayment={conference?.unlockPayments}
		unlockPostals={conference?.unlockPostals}
	/>
{/if}

{#if conference.state !== 'PARTICIPANT_REGISTRATION'}
	<TasksWrapper>
		{#if supervisor.delegations
			.flatMap((x) => x.members.map((y) => y.assignedCommittee))
			.some((x) => !x)}
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
				btnLink={`./${conferenceData.findUniqueConference?.id}/info`}
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

<section class="flex flex-col gap-2">
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
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegations()}</h2>
	{#if supervisor && supervisor.delegations.length > 0}
		{#if conference.state === 'PARTICIPANT_REGISTRATION'}
			<div class="flex flex-col gap-2 sm:flex-row sm:gap-8">
				<div class="text-sm">
					<i class="fa-solid fa-hourglass-half text-warning"></i>
					<span> = {m.notApplied()}</span>
				</div>
				<div class="text-sm">
					<i class="fa-solid fa-circle-check text-success"></i>
					<span> = {m.applied()}</span>
				</div>
			</div>
		{/if}
		{#each delegations as delegation, index}
			<div
				tabindex="-1"
				class="collapse bg-base-100 p-4 shadow-md transition-colors duration-300 hover:bg-base-200 dark:bg-base-200 dark:hover:bg-base-300"
			>
				<input type="radio" name="supervisor-accordion-1" checked={index === 0} />
				<div class="collapse-title flex flex-col text-nowrap text-xl font-medium sm:flex-row">
					<div class="mb-6 flex items-center sm:mb-0">
						<div>
							{#if conference.state === 'PARTICIPANT_REGISTRATION'}
								{#if delegation.applied}
									<i class="fa-solid fa-circle-check text-3xl text-success"></i>
								{:else}
									<i class="fa-solid fa-hourglass-half text-3xl text-warning"></i>
								{/if}
							{:else}
								<Flag
									size="sm"
									alpha2Code={delegation.assignedNation?.alpha2Code}
									nsa={!!delegation.assignedNonStateActor}
									icon={delegation.assignedNonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
								/>
							{/if}
						</div>
						<div class="divider divider-horizontal"></div>
						<div><i class="fa-duotone fa-fingerprint mr-4"></i>{delegation.entryCode}</div>
					</div>
					<div class="divider divider-horizontal hidden sm:flex"></div>
					<div class="flex items-center">
						<div><i class="fa-duotone fa-users mr-4"></i>{delegation.members.length}</div>
						<div class="divider divider-horizontal"></div>
						<div>
							<i class="fa-duotone fa-medal mr-4"></i>{(delegation?.members.find(
								(x) => x.isHeadDelegate
							) &&
								getName(delegation?.members.find((x) => x.isHeadDelegate)!.user, true)) ??
								'N/A'}
						</div>
					</div>
				</div>
				<div class="collapse-content overflow-x-auto">
					<div class="mt-10 grid grid-cols-[1fr] gap-x-4 text-sm sm:grid-cols-[auto_1fr]">
						<div class="font-bold">{m.members()}</div>
						<div class="mb-4 flex flex-wrap gap-1">
							{#each delegation.members as member}
								<span class="badge badge-primary">
									{getName(member.user)}
									{#if member.assignedCommittee}
										<span class="tooltip ml-2" data-tip={member.assignedCommittee?.name}>
											{member.assignedCommittee?.abbreviation}
										</span>
									{/if}
								</span>
							{/each}
						</div>
						<div class="font-bold">{m.supervisors()}</div>
						<div class="mb-4 flex flex-wrap gap-1">
							{#each delegation.supervisors as supervisor}
								<span class="badge badge-outline">{getName(supervisor.user)}</span>
							{/each}
						</div>
						{#if conference.state === 'PARTICIPANT_REGISTRATION'}
							<div class="font-bold">{m.delegationStatus()}</div>
							<div class="mb-4">
								{#if delegation.applied}
									<span class="badge badge-success">{m.applied()}</span>
								{:else}
									<span class="badge badge-warning">{m.notApplied()}</span>
								{/if}
							</div>
						{:else}
							<div class="font-bold">{m.role()}</div>
							<div class="badge badge-primary mb-4">
								{delegation.assignedNation
									? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
									: delegation.assignedNonStateActor?.name}
							</div>
							{#if delegation.assignedNation}
								<div class="font-bold">{m.committees()}</div>
								<div class="mb-4 flex flex-col gap-1">
									{#each conference.committees
										.filter( (x) => x.nations.some((y) => y.alpha3Code === delegation.assignedNation!.alpha3Code) )
										.map((x) => `${x.name} (${x.abbreviation})`) as committee}
										<div class="badge badge-neutral">{committee}</div>
									{/each}
								</div>
							{/if}
						{/if}
						{#if conference.state === 'PARTICIPANT_REGISTRATION'}
							<div class="font-bold">{m.schoolOrInstitution()}</div>
							<div class="mb-4">{delegation.school}</div>
							<div class="font-bold">{m.experience()}</div>
							<div class="mb-4">{delegation.experience}</div>
							<div class="font-bold">{m.motivation()}</div>
							<div class="mb-4">{delegation.motivation}</div>
							<div class="font-bold">{m.delegationPreferences()}</div>
							<div class="flex flex-wrap gap-1">
								{#if delegation.appliedForRoles.length > 0}
									{#each delegation.appliedForRoles.sort((x) => x.rank) as roleApplication}
										<div class="flex gap-2">
											<div class="badge bg-base-300">
												{roleApplication.nation
													? getFullTranslatedCountryNameFromISO3Code(
															roleApplication.nation.alpha3Code
														)
													: roleApplication.nonStateActor?.name}
											</div>
										</div>
									{/each}
								{:else}{m.noRoleApplications()}
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div class="alert alert-warning">
			<i class="fa-solid fa-exclamation-triangle text-xl"></i>
			{m.noDelegationsFound()}
		</div>
	{/if}
	{#if conference.state === 'PARTICIPANT_REGISTRATION'}
		<a
			class="btn btn-ghost btn-wide mt-4"
			href="/registration/{conference.id}/join-delegation-supervisor"
		>
			<i class="fa-solid fa-plus"></i>
			{m.addAnotherDelegation()}
		</a>
	{/if}
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.singleParticipants()}</h2>
	<div class="alert alert-info">
		<i class="fa-solid fa-exclamation-triangle text-xl"></i>
		{m.noSingleApplicationTrackingYet()}
	</div>
</section>
