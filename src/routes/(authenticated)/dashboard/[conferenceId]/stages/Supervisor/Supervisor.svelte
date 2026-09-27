<script lang="ts">
	import codenamize from '$lib/helpers/codenamize';
	import type { PageData } from '../../$types';
	import { alpha3Code, m } from '$lib/paraglide/messages';
	import GenericWidget from '$lib/components/delegationStats/GenericWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '$lib/components/dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '$lib/components/dashboard/DashboardLinkCard.svelte';
	import { getLinksForUserType, type DashboardLinkContext } from '$lib/data/dashboardLinks';
	import Flag from '$lib/components/Flag.svelte';
	import ConferenceStatusWidget from '../../ConferenceStatusWidget.svelte';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import formatNames, { formatInitials } from '$lib/helpers/formatNames';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import getSimplifiedPostalStatus from '$lib/helpers/getSimplifiedPostalStatus';
	import {
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/utils/pdfGenerator';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import EntryCode from '../Common/EntryCode.svelte';
	import SupervisorContentCard from './SupervisorContentCard.svelte';
	import DelegationStatsCharts from './DelegationStatsCharts.svelte';
	import InfoGrid from '$lib/components/infoGrid';
	import { SvelteSet } from 'svelte/reactivity';

	// TODO these components need some refactoring

	interface Props {
		user: PageData['user'];
		conference: NonNullable<MyConferenceParticipation['conference']>;
		supervisor: NonNullable<MyConferenceParticipation['supervisor']>;
		status: MyConferenceParticipation['participantStatus'];
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
	let rejectedParticipants = $derived.by(() => {
		const res: { givenName: string | null; familyName: string | null; id: string }[] = [];
		if (isStateParticipantRegistration) return res;
		supervisor.supervisedDelegationMembers
			.filter((x) => !x.delegation.assignedNation && !x.delegation.assignedNonStateActor)
			.forEach((member) => {
				res.push(member.user);
			});

		supervisor.supervisedSingleParticipants
			.filter((x) => !x.assignedRole)
			.forEach((participant) => {
				res.push(participant.user);
			});

		return res;
	});
	let delegations = $derived([
		...new Map(delegationMembers.map((x) => [x.delegation.id, x.delegation])).values()
	]);
	// Get all papers from unique delegations (using delegationMembers to access papers)
	let allPapers = $derived.by(() => {
		const seenDelegationIds = new SvelteSet<string>();
		const papers: NonNullable<(typeof delegationMembers)[number]['delegation']['papers']> = [];
		delegationMembers.forEach((member) => {
			if (!seenDelegationIds.has(member.delegation.id)) {
				seenDelegationIds.add(member.delegation.id);
				papers.push(...(member.delegation.papers ?? []));
			}
		});
		return papers;
	});
	let singleParticipants = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedSingleParticipants
			: supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole)
	);

	// Calculate total and accepted students for the students overview
	let totalStudentsCount = $derived(
		supervisor.supervisedDelegationMembers.length + supervisor.supervisedSingleParticipants.length
	);
	let acceptedStudentsCount = $derived(delegationMembers.length + singleParticipants.length);
	let allStudentsAccepted = $derived(
		!isStateParticipantRegistration &&
			totalStudentsCount > 0 &&
			acceptedStudentsCount === totalStudentsCount
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
			value: delegationMembers.length,
			desc: m.inAllDelegations()
		},
		{
			icon: 'users',
			title: m.singleParticipants(),
			value: singleParticipants.length,
			desc: m.singleParticipants()
		}
	]);

	// Check if all payments are complete (supervisor + all supervised members + single participants)
	let allPaymentsComplete = $derived.by(() => {
		// Check supervisor's own payment status
		const supervisorPaid = status?.paymentStatus === 'DONE';

		// Check all supervised delegation members' payment status
		const allMembersPaid = delegationMembers.every((member) => {
			const participantStatus = member.user.conferenceParticipantStatus?.find(
				(s) => s.conference.id === conference?.id
			);
			return participantStatus?.paymentStatus === 'DONE';
		});

		// Check all single participants' payment status
		const allSinglesPaid = singleParticipants.every((sp) => {
			const participantStatus = sp.user.conferenceParticipantStatus?.find(
				(s) => s.conference.id === conference?.id
			);
			return participantStatus?.paymentStatus === 'DONE';
		});

		return supervisorPaid && allMembersPaid && allSinglesPaid;
	});

	const handlePresenceChange = async (e: Event) => {
		const promise = client.mutate.updateConferenceSupervisor({
			__args: {
				id: supervisor.id,
				plansOwnAttendenceAtConference: (e.target as HTMLInputElement).checked
			},
			id: true,
			plansOwnAttendenceAtConference: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;

		await invalidateAll();
	};

	/** The consent documents are only needed when one is actually downloaded, so they are fetched here. */
	function fetchPostalDetails(id: string, conferenceId: string) {
		return Promise.all([
			client.query.user({
				__args: { id },
				id: true,
				givenName: true,
				familyName: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				birthday: true
			}),
			client.query.conference({
				__args: { id: conferenceId },
				id: true,
				contractContent: true,
				guardianConsentContent: true,
				mediaConsentContent: true,
				termsAndConditionsContent: true
			})
		]);
	}

	const downloadPostalDocuments = async (userId: string) => {
		try {
			const [user, conferenceConsents] = await fetchPostalDetails(userId, conference.id);

			if (user) {
				if (!user.street || !user.zip || !user.city || !user.country || !user.birthday) {
					toast.error(m.incompleteAddressOrBirthdayForPostalRegistration());
					return;
				}

				const recipientData: RecipientData = {
					name: `${conference?.postalName}`,
					address: `${conference?.postalStreet} ${conference?.postalApartment ? conference?.postalApartment : ''}`,
					zip: conference?.postalZip?.toString() ?? '',
					city: conference?.postalCity ?? '',
					country: conference?.postalCountry ?? ''
				};

				const participantData: ParticipantData = {
					id: user.id,
					name: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
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
					conferenceConsents?.contractContent ?? undefined,
					conferenceConsents?.guardianConsentContent ?? undefined,
					conferenceConsents?.mediaConsentContent ?? undefined,
					conferenceConsents?.termsAndConditionsContent ?? undefined,
					`${formatInitials(user.givenName ?? undefined, user.familyName ?? undefined)}_postal_registration.pdf`
				);

				toast.success(m.postalRegistrationPDFGenerated());
			} else {
				console.error('User details not found');
				toast.error(m.errorGeneratingPostalRegistrationPDF());
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.errorGeneratingPostalRegistrationPDF());
		}
	};

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId: conference.id,
		userType: 'supervisor',
		conferenceState: conference.state,
		unlockPayments: conference.unlockPayments,
		unlockPostals: conference.unlockPostals,
		hasConferenceInfo: !!conference.info,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		isOpenPaperSubmission: conference.isOpenPaperSubmission,
		paymentStatus: status?.paymentStatus,
		postalRegistrationStatus: getSimplifiedPostalStatus(status, ofAge),
		user
	});

	const visibleLinks = $derived(getLinksForUserType('supervisor', linkContext));
</script>

{#if isStateParticipantRegistration}
	<section class="alert alert-info">
		<i class="fa-solid fa-circle-info text-xl"></i>
		{m.registeredAsSupervisor()}
	</section>
{/if}

<DashboardSection icon="chart-pie" title={m.overview()} description={m.overviewDescription()}>
	<GenericWidget content={stats} />
</DashboardSection>

<DashboardSection
	icon="user-check"
	title={m.ownPresence()}
	description={m.ownPresenceDescription()}
>
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
		{#if supervisor.plansOwnAttendenceAtConference}
			{@html m.willBePresentAtConference()}
		{:else}
			{@html m.willNotBePresentAtConference()}
		{/if}
	</p>
</DashboardSection>

{#if !isStateParticipantRegistration}
	{#if !allPaymentsComplete}
		<ConferenceStatusWidget
			conferenceId={conference!.id}
			userId={user.sub}
			ofAgeAtConference={ofAge}
			{status}
			unlockPayment={conference?.unlockPayments}
			unlockPostals={conference?.unlockPostals}
		/>
	{/if}

	<DashboardSection icon="chart-bar" title={m.delegationStatistics()}>
		<DelegationStatsCharts
			members={delegationMembers}
			papers={allPapers}
			conferenceId={conference.id}
			conferenceStartDate={conference.startConference}
		/>
	</DashboardSection>

	{#if delegationMembers.some((x) => x.delegation.assignedNation && !x.assignedCommittee)}
		<div class="alert alert-warning">
			<i class="fas fa-arrows-turn-to-dots text-2xl"></i>
			<div>
				<h3 class="font-bold">{m.committeeAssignment()}</h3>
				<p>{m.committeeAssignmentAlertDescriptionSupervisor()}</p>
			</div>
		</div>
	{/if}

	<DashboardSection icon="link" title={m.quickLinks()} description={m.quickLinksDescription()}>
		<DashboardLinksGrid>
			{#each visibleLinks as link (link.id)}
				{@const badge = link.getBadge?.(linkContext)}
				<DashboardLinkCard
					href={link.getHref(linkContext)}
					icon={link.icon}
					title={link.getTitle()}
					description={link.getDescription()}
					external={link.external}
					disabled={link.isDisabled(linkContext)}
					badge={badge?.value}
					badgeType={badge?.type}
					important={link.isImportant?.(linkContext) ?? false}
				/>
			{/each}
		</DashboardLinksGrid>
	</DashboardSection>
{/if}

<DashboardSection icon="flag" title={m.delegations()} description={m.delegationsDescription()}>
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
								<div class="flex items-center gap-2">
									<Flag
										size="xs"
										alpha2Code={delegation.assignedNation?.alpha2Code}
										nsa={!!delegation.assignedNonStateActor}
										icon={delegation.assignedNonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
									/>
									{#if delegation.assignedNation}
										{getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)}
									{:else if delegation.assignedNonStateActor}
										{delegation.assignedNonStateActor.name}
									{/if}
								</div>
							</InfoGrid.Entry>
						{/if}
						<InfoGrid.Entry
							title={m.delegationMembers()}
							fontAwesomeIcon="fa-duotone fa-users"
							content={delegation.members.length}
						/>
						{#if isStateParticipantRegistration}
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
						{/if}
					</InfoGrid.Grid>
				{/snippet}

				{#snippet memberSpace()}
					<DelegationStatusTableWrapper
						withPostalSatus={!isStateParticipantRegistration}
						withPaymentStatus={!isStateParticipantRegistration}
						withCommittee={!isStateParticipantRegistration}
						withPaperCount={!isStateParticipantRegistration}
						withEmail
						title={m.members()}
					>
						{#each members ?? [] as member (member.id)}
							{@const participantStatus = member.user?.conferenceParticipantStatus.find(
								(x) => x.conference.id === conference?.id
							)}
							{@const memberPaperCount =
								delegation.papers?.filter((p) => p.author?.id === member.user.id).length ?? 0}
							<DelegationStatusTableEntry
								name={formatNames(
									member.user.givenName ?? undefined,
									member.user.familyName ?? undefined
								)}
								pronouns={member.user.pronouns ?? ''}
								headDelegate={member.isHeadDelegate}
								email={member.user.email}
								committee={!isStateParticipantRegistration
									? (member.assignedCommittee?.abbreviation ?? '')
									: undefined}
								withPaymentStatus={!isStateParticipantRegistration}
								withPostalStatus={!isStateParticipantRegistration}
								withPaperCount={!isStateParticipantRegistration}
								paperCount={memberPaperCount}
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
</DashboardSection>

<DashboardSection icon="user" title={m.singleParticipants()}>
	{#if singleParticipants.length > 0}
		{#each singleParticipants as singleParticipant (singleParticipant.id)}
			<SupervisorContentCard
				title={formatNames(
					singleParticipant.user.givenName ?? undefined,
					singleParticipant.user.familyName ?? undefined
				)}
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
						{#if isStateParticipantRegistration}
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
						{/if}
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
								singleParticipant.user.givenName ?? undefined,
								singleParticipant.user.familyName ?? undefined
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
</DashboardSection>

<DashboardSection
	icon="users-line"
	title={m.connectWithStudents()}
	description={m.connectWithStudentsDescription()}
>
	<EntryCode
		entryCode={supervisor.connectionCode}
		referralLink={connectionLink}
		userHasRotationPermission={true}
		rotationFn={async () => {
			const promise = client.mutate.rotateSupervisorConnectionCode({
				__args: { id: supervisor.id },
				id: true,
				connectionCode: true
			});
			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: m.codeRotated(),
				error: m.genericToastError()
			});
			await promise;
			await invalidateAll();
		}}
	/>
</DashboardSection>

{#if !isStateParticipantRegistration && totalStudentsCount > 0}
	<DashboardSection
		icon={allStudentsAccepted ? 'circle-check' : 'user-xmark'}
		title={allStudentsAccepted ? m.yourStudents() : m.rejectedParticipants()}
		description={allStudentsAccepted
			? m.yourStudentsPostDescription()
			: m.rejectedParticipantsDescription()}
	>
		<div class="stats bg-base-200 shadow">
			<div class="stat">
				<div class="stat-figure text-primary">
					<i
						class="fa-duotone text-4xl"
						class:fa-circle-check={allStudentsAccepted}
						class:text-success={allStudentsAccepted}
						class:fa-users={!allStudentsAccepted}
					></i>
				</div>
				<div class="stat-title">{m.studentsAccepted()}</div>
				<div class="stat-value">{acceptedStudentsCount} / {totalStudentsCount}</div>
				{#if allStudentsAccepted}
					<div class="stat-desc text-success">{m.allStudentsAcceptedMessage()}</div>
				{/if}
			</div>
		</div>

		{#if rejectedParticipants.length > 0}
			<div class="card bg-base-100 border-base-200 mt-4 border p-4 shadow-md">
				<h4 class="mb-2 font-semibold">{m.rejectedParticipants()}</h4>
				<table class="table w-full">
					<tbody>
						{#each rejectedParticipants as rejectedParticipant (rejectedParticipant.id)}
							<tr>
								<td>
									{formatNames(
										rejectedParticipant.givenName ?? undefined,
										rejectedParticipant.familyName ?? undefined
									)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</DashboardSection>
{/if}
