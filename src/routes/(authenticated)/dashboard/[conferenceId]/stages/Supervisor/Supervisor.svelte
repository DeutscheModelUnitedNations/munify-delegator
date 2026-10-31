<script lang="ts">
	import StudentsAcceptedStat from '../Common/StudentsAcceptedStat.svelte';
	import type { CurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import type { ConferenceState } from '#lib/data/dashboardLinks';
	import GenericWidget from '#lib/components/delegationStats/GenericWidget.svelte';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import ApplicationRejected from '#lib/components/ApplicationRejected.svelte';
	import AssignmentPending from '#lib/components/AssignmentPending.svelte';
	import ChunkLoadError from '#lib/components/ChunkLoadError.svelte';
	import formatNames from '#lib/helpers/formatNames';
	import ConferenceStatusWidget from '../../ConferenceStatusWidget.svelte';
	import DelegationStatsCharts from './DelegationStatsCharts.svelte';
	import SupervisorPresence from './SupervisorPresence.svelte';
	import MySchool from '../Common/MySchool.svelte';
	import SupervisorConnectionCode from './SupervisorConnectionCode.svelte';
	import SupervisedDelegationCard from './SupervisedDelegationCard.svelte';
	import SupervisedSingleParticipantCard from './SupervisedSingleParticipantCard.svelte';
	import SupervisorSelectionPendingStage from './SupervisorSelectionPendingStage.svelte';

	interface Props {
		conferenceId: string;
		conferenceState: ConferenceState;
		/** Whether the team has released the assignment; until then nobody is accepted or rejected. */
		assignmentReleased: boolean;
		/** Whether the application deadline has passed and the team is selecting. */
		selectionInProgress: boolean;
		supervisorId: string;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'];
		ofAge: boolean;
	}

	let {
		conferenceId,
		conferenceState,
		assignmentReleased,
		selectionInProgress,
		supervisorId,
		user,
		status,
		ofAge
	}: Props = $props();

	/**
	 * Just who this supervisor's students are and whether they got a role: enough to count them and
	 * decide what to show. Each card fetches the details of the students it lists.
	 */
	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			id: true,
			supervisedDelegationMembers: {
				id: true,
				assignedCommittee: { id: true },
				user: {
					id: true,
					givenName: true,
					familyName: true,
					conferenceParticipants: { paymentStatus: true, conference: { id: true } }
				},
				delegation: {
					id: true,
					assignedRole: { id: true, kind: true }
				}
			},
			supervisedSingleParticipants: {
				id: true,
				user: {
					id: true,
					givenName: true,
					familyName: true,
					conferenceParticipants: { paymentStatus: true, conference: { id: true } }
				},
				assignedRole: { id: true }
			}
		})
	);

	let isStateParticipantRegistration = $derived(conferenceState === 'PARTICIPANT_REGISTRATION');

	const acceptedDelegationMembers = $derived(
		supervisor.supervisedDelegationMembers.filter((x) => x.delegation.assignedRole)
	);
	const acceptedSingleParticipants = $derived(
		supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole)
	);

	// While registration is open nobody has been accepted or rejected yet, so everyone is listed.
	let delegationMembers = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedDelegationMembers
			: acceptedDelegationMembers
	);
	let singleParticipants = $derived(
		isStateParticipantRegistration
			? supervisor.supervisedSingleParticipants
			: acceptedSingleParticipants
	);
	let delegationIds = $derived([...new Set(delegationMembers.map((x) => x.delegation.id))]);

	let rejectedParticipants = $derived(
		isStateParticipantRegistration
			? []
			: [
					...supervisor.supervisedDelegationMembers
						.filter((x) => !x.delegation.assignedRole)
						.map((x) => x.user),
					...supervisor.supervisedSingleParticipants
						.filter((x) => !x.assignedRole)
						.map((x) => x.user)
				]
	);

	let totalStudentsCount = $derived(
		supervisor.supervisedDelegationMembers.length + supervisor.supervisedSingleParticipants.length
	);
	let acceptedStudentsCount = $derived(
		acceptedDelegationMembers.length + acceptedSingleParticipants.length
	);
	let atLeastOneAccepted = $derived(acceptedStudentsCount > 0);
	/**
	 * After registration, before anything else: whether the assignment is still being made, or
	 * none of the students got a role.
	 */
	const outcomeView = $derived.by(() => {
		if (isStateParticipantRegistration) return undefined;
		if (!assignmentReleased) return 'pending';
		return atLeastOneAccepted ? undefined : 'rejected';
	});
	let allStudentsAccepted = $derived(
		!isStateParticipantRegistration &&
			totalStudentsCount > 0 &&
			acceptedStudentsCount === totalStudentsCount
	);

	const stats = $derived([
		{
			icon: 'flag',
			title: m.delegations(),
			value: delegationIds.length,
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

	const isPaid = (person: (typeof delegationMembers)[number]['user']) =>
		person.conferenceParticipants.find((s) => s.conference.id === conferenceId)?.paymentStatus ===
		'DONE';

	// The supervisor's own payment plus every listed student's
	let allPaymentsComplete = $derived(
		status?.paymentStatus === 'DONE' &&
			delegationMembers.every((member) => isPaid(member.user)) &&
			singleParticipants.every((participant) => isPaid(participant.user))
	);
</script>

{#snippet afterRegistration()}
	{#if !allPaymentsComplete}
		<ConferenceStatusWidget {conferenceId} ofAgeAtConference={ofAge} {status} />
	{/if}

	<DashboardSection icon="chart-bar" title={m.delegationStatistics()}>
		<DelegationStatsCharts {conferenceId} {supervisorId} />
	</DashboardSection>

	{#if delegationMembers.some((x) => x.delegation.assignedRole?.kind === 'NATION' && !x.assignedCommittee)}
		<div class="alert alert-warning">
			<i class="fas fa-arrows-turn-to-dots text-2xl"></i>
			<div>
				<h3 class="font-bold">{m.committeeAssignment()}</h3>
				<p>{m.committeeAssignmentAlertDescriptionSupervisor()}</p>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet students()}
	<DashboardSection icon="flag" title={m.delegations()} description={m.delegationsDescription()}>
		{#each delegationIds as delegationId (delegationId)}
			<SupervisedDelegationCard
				{conferenceId}
				{supervisorId}
				{delegationId}
				{isStateParticipantRegistration}
			/>
		{:else}
			<div class="alert alert-warning">
				<i class="fa-sharp-duotone fa-solid fa-exclamation-triangle text-xl"></i>
				{m.noDelegationsFound()}
			</div>
		{/each}
	</DashboardSection>

	<DashboardSection icon="user" title={m.singleParticipants()}>
		{#each singleParticipants as singleParticipant (singleParticipant.id)}
			<SupervisedSingleParticipantCard
				{conferenceId}
				singleParticipantId={singleParticipant.id}
				{isStateParticipantRegistration}
			/>
		{:else}
			<div class="alert alert-warning">
				<i class="fa-sharp-duotone fa-solid fa-exclamation-triangle text-xl"></i>
				{m.noSingleParticipantsFound()}
			</div>
		{/each}
	</DashboardSection>
{/snippet}

{#snippet outcome()}
	<DashboardSection
		icon={allStudentsAccepted ? 'circle-check' : 'user-xmark'}
		title={allStudentsAccepted ? m.yourStudents() : m.rejectedParticipants()}
		description={allStudentsAccepted
			? m.yourStudentsPostDescription()
			: m.rejectedParticipantsDescription()}
	>
		<StudentsAcceptedStat accepted={acceptedStudentsCount} total={totalStudentsCount} />

		{#if rejectedParticipants.length > 0}
			<div class="card bg-base-100 border-base-200 mt-4 border p-4 shadow-md">
				<h4 class="mb-2 font-semibold">{m.rejectedParticipants()}</h4>
				<table class="table w-full">
					<tbody>
						{#each rejectedParticipants as rejectedParticipant (rejectedParticipant.id)}
							<tr>
								<td>
									{formatNames({
										givenName: rejectedParticipant.givenName ?? undefined,
										familyName: rejectedParticipant.familyName ?? undefined
									})}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</DashboardSection>
{/snippet}

<!-- The dashboard before the conference is over -->
{#snippet beforePost()}
	{#if isStateParticipantRegistration}
		<section class="alert alert-info alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-circle-info text-xl"></i>
			{m.registeredAsSupervisor()}
		</section>
	{/if}

	<!-- Without any students, connecting them is the one thing to do here -->
	{#if totalStudentsCount === 0}
		<SupervisorConnectionCode {conferenceId} {supervisorId} />
	{:else}
		<DashboardSection icon="chart-pie" title={m.overview()} description={m.overviewDescription()}>
			<GenericWidget content={stats} />
		</DashboardSection>
	{/if}

	<DashboardSection
		icon="id-card"
		title={m.supervisorDetails()}
		description={m.supervisorDetailsDescription()}
	>
		<div class="bg-base-200 rounded-box divide-base-300 divide-y">
			<SupervisorPresence {supervisorId} editable={isStateParticipantRegistration} />
			<MySchool {conferenceId} hint={m.supervisorSchoolDescription()} />
		</div>
	</DashboardSection>

	{#if !isStateParticipantRegistration}
		{@render afterRegistration()}
	{/if}

	{#if totalStudentsCount > 0}
		{@render students()}

		<SupervisorConnectionCode {conferenceId} {supervisorId} />
	{/if}

	{#if !isStateParticipantRegistration && totalStudentsCount > 0}
		{@render outcome()}
	{/if}
{/snippet}

{#if selectionInProgress}
	<SupervisorSelectionPendingStage {supervisorId} />
{:else if outcomeView === 'pending'}
	<AssignmentPending />
{:else if outcomeView === 'rejected'}
	<ApplicationRejected />
{:else if conferenceState === 'POST'}
	{#await import('../Common/Certificate.svelte') then { default: Certificate }}
		<Certificate
			{conferenceId}
			userId={user.sub}
			didAttend={!!status?.didAttend}
			isSupervisor={true}
			{totalStudentsCount}
			{acceptedStudentsCount}
		/>
	{:catch error}
		<ChunkLoadError {error} />
	{/await}
{:else}
	{@render beforePost()}
{/if}
