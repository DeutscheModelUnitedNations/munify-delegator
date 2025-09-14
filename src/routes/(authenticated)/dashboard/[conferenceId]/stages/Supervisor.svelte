<script lang="ts">
	import codenamize from '$lib/services/codenamize';
	import type { PageData } from '../$houdini';
	import { alpha3Code, m } from '$lib/paraglide/messages';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { cache, graphql, type MyConferenceparticipationQuery$result } from '$houdini';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import ConferenceStatusWidget from '../ConferenceStatusWidget.svelte';
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
	import DashboardContentCard from '$lib/components/DashboardContentCard.svelte';
	import { page } from '$app/state';
	import { qr } from '@svelte-put/qr/svg';

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
	let isStateParticipantRegistration = $derived(conference.state === 'PARTICIPANT_REGISTRATION');
	let delegationMembers = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedDelegationMembers
			: supervisor.supervisedDelegationMembers.filter(
					(x) => x.delegation.assignedNation || x.delegation.assignedNonStateActor
				)
	);
	let delegations = $derived(delegationMembers.map((x) => x.delegation));
	let singleParticipants = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedSingleParticipants
			: supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole)
	);
	let status = $derived(conferenceData.findUniqueConferenceParticipantStatus);

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
	<div class="card max-w-80 bg-base-100 p-6 shadow-md dark:bg-base-200">
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={supervisor.plansOwnAttendenceAtConference}
					onchange={handlePresenceChange}
					disabled={!isStateParticipantRegistration}
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

<section class="flex flex-col gap-6">
	<h2 class="text-2xl font-bold">{m.delegations()}</h2>
	<p class="text-sm">{m.delegationsDescription()}</p>
	{#if delegations.length > 0}
		{#each delegations as delegation, index}
			{@const members = delegationMembers.filter((x) => x.delegation.id === delegation.id)}
			{@const hiddenMembers = delegation.members.filter(
				(x) => !members.map((y) => y.id).includes(x.id)
			)}
			<DashboardContentCard title={codenamize(delegation.id)} class="bg-base-200">
				{#if isStateParticipantRegistration}
					<div
						class="badge {delegation.applied
							? 'badge-success'
							: 'badge-warning'} badge-lg absolute right-4 top-0 z-10 -translate-y-1/2"
					>
						{#if delegation.applied}
							<i class="fa-solid fa-circle-check mr-2"></i> {m.applied()}
						{:else}
							<i class="fa-solid fa-hourglass-half mr-2"></i> {m.notApplied()}
						{/if}
					</div>
				{/if}
				<table class="table mb-10">
					<thead>
						<tr>
							<th></th>
							<th class="w-full"></th>
						</tr>
					</thead>
					<tbody>
						{#if isStateParticipantRegistration}
							<tr>
								<td>{m.roleApplications()}</td>
								<td>
									{#if delegation.appliedForRoles.length > 0}
										<div class="flex flex-wrap gap-2">
											{#each delegation.appliedForRoles.sort((x) => x.rank) as roleApplication}
												<Flag
													size="xs"
													alpha2Code={roleApplication.nation?.alpha2Code}
													nsa={!!roleApplication.nonStateActor}
													icon={roleApplication.nonStateActor?.fontAwesomeIcon ??
														'fa-hand-point-up'}
												/>
											{/each}
										</div>
									{:else}
										<i class="fa-duotone fa-dash"></i>
									{/if}
								</td>
							</tr>

							<tr>
								<td>{m.entryCode()}</td>
								<td>{delegation.entryCode}</td>
							</tr>
						{:else}
							<tr>
								<td>{m.role()}</td>
								<td>
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
								</td>
							</tr>
						{/if}

						<tr>
							<td>{m.members()}</td>
							<td>{delegation.members.length}</td>
						</tr>

						<tr>
							<td>{m.schoolOrInstitution()}</td>
							{#if delegation.school}
								<td>{delegation.school}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
						<tr>
							<td>{m.experience()}</td>
							{#if delegation.experience}
								<td>{delegation.experience}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
						<tr>
							<td>{m.motivation()}</td>
							{#if delegation.motivation}
								<td>{delegation.motivation}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
					</tbody>
				</table>

				<DelegationStatusTableWrapper
					withPostalSatus={!isStateParticipantRegistration}
					withPaymentStatus={!isStateParticipantRegistration}
					withCommittee={!isStateParticipantRegistration}
					withEmail
					title={m.members()}
				>
					{#each members ?? [] as member}
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
					{#each hiddenMembers as member}
						<tr>
							<td colspan="5" class="italic text-gray-500">
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
			</DashboardContentCard>
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
		{#each singleParticipants as singleParticipant, index}
			<DashboardContentCard
				title={formatNames(singleParticipant.user.given_name, singleParticipant.user.family_name)}
				class="bg-base-200"
			>
				{#if isStateParticipantRegistration}
					<div
						class="badge {singleParticipant.applied
							? 'badge-success'
							: 'badge-warning'} badge-lg absolute right-4 top-0 z-10 -translate-y-1/2"
					>
						{#if singleParticipant.applied}
							<i class="fa-solid fa-circle-check mr-2"></i> {m.applied()}
						{:else}
							<i class="fa-solid fa-hourglass-half mr-2"></i> {m.notApplied()}
						{/if}
					</div>
				{/if}
				<table class="table mb-10">
					<thead>
						<tr>
							<th></th>
							<th class="w-full"></th>
						</tr>
					</thead>
					<tbody>
						{#if isStateParticipantRegistration}
							<tr>
								<td>{m.roleApplications()}</td>
								<td>
									{#if singleParticipant.appliedForRoles.length > 0}
										<div class="flex flex-wrap gap-2">
											{#each singleParticipant.appliedForRoles as roleApplication}
												<div class="badge">
													<i
														class="fa-duotone fa-{roleApplication.fontAwesomeIcon.replace(
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
								</td>
							</tr>
						{:else}
							<tr>
								<td>{m.role()}</td>
								<td>
									<Flag
										size="xs"
										alpha2Code={singleParticipant.assignedNation?.alpha2Code}
										nsa={!!singleParticipant.assignedNonStateActor}
										icon={singleParticipant.assignedNonStateActor?.fontAwesomeIcon ??
											'fa-hand-point-up'}
									/>
									{#if singleParticipant.assignedNation}
										{getFullTranslatedCountryNameFromISO3Code(
											singleParticipant.assignedNation.alpha3Code
										)}
										({alpha3Code(singleParticipant.assignedNation.alpha3Code)})
									{:else if singleParticipant.assignedNonStateActor}
										{singleParticipant.assignedNonStateActor.name}
									{/if}
								</td>
							</tr>
						{/if}

						<tr>
							<td>{m.schoolOrInstitution()}</td>
							{#if singleParticipant.school}
								<td>{singleParticipant.school}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
						<tr>
							<td>{m.experience()}</td>
							{#if singleParticipant.experience}
								<td>{singleParticipant.experience}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
						<tr>
							<td>{m.motivation()}</td>
							{#if singleParticipant.motivation}
								<td>{singleParticipant.motivation}</td>
							{:else}
								<td><i class="fa-duotone fa-dash"></i></td>
							{/if}
						</tr>
					</tbody>
				</table>

				<DelegationStatusTableWrapper
					withPostalSatus={!isStateParticipantRegistration}
					withPaymentStatus={!isStateParticipantRegistration}
					withCommittee={!isStateParticipantRegistration}
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
						headDelegate={singleParticipant.isHeadDelegate}
						email={singleParticipant.user.email}
						committee={!isStateParticipantRegistration
							? (singleParticipant.assignedCommittee?.abbreviation ?? '')
							: undefined}
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
			</DashboardContentCard>
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
	class="bg-base-200"
>
	<div class="mt-4 flex items-center gap-2 rounded-lg bg-base-200 p-2 pl-4 dark:bg-base-300">
		<p class="overflow-x-auto font-mono text-xl uppercase tracking-[0.6rem]">
			{supervisor.connectionCode}
		</p>
		<button
			class="btn btn-square btn-ghost btn-primary"
			onclick={() => {
				navigator.clipboard.writeText(supervisor.connectionCode);
				toast.success(m.codeCopied());
			}}
			aria-label="Copy entry code"
			><i class="fa-duotone fa-clipboard text-xl"></i>
		</button>
		<button
			class="btn btn-square btn-ghost btn-primary tooltip"
			data-tip={m.copyLink()}
			onclick={() => {
				navigator.clipboard.writeText(connectionLink as string);
				toast.success(m.linkCopied());
			}}
			aria-label="Copy referral link"
			><i class="fa-duotone fa-link text-xl"></i>
		</button>
		<div class="tooltip" data-tip={m.rotateCode()}>
			<button
				class="btn btn-square btn-ghost btn-primary"
				onclick={async () => {
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
				aria-label="Rotate connection code"
				><i class="fa-duotone fa-rotate text-xl"></i>
			</button>
		</div>
	</div>

	<svg use:qr={{ data: connectionLink as string, shape: 'circle' }} class="mt-4 max-w-sm" />
</DashboardContentCard>
