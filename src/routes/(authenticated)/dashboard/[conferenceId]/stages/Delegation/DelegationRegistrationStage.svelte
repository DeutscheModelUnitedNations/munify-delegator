<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import GenericWidget from '$lib/components/delegationStats/GenericWidget.svelte';
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import DelegationNameDisplay from '$lib/components/DelegationNameDisplay.svelte';
	import type { ApplicationAnswers } from '../../applicationForm';
	import ApplicationQuestionnaire from '../Common/ApplicationQuestionnaire.svelte';
	import CompleteSignupCard from '../Common/CompleteSignupCard.svelte';
	import RegistrationDangerZone from '../Common/RegistrationDangerZone.svelte';
	import RegistrationStatusAlert from '../Common/RegistrationStatusAlert.svelte';
	import RoleApplicationTable from './RoleApplicationTable.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';
	import DelegationRegistrationMembers from './DelegationRegistrationMembers.svelte';

	interface Props {
		conferenceId: string;
		delegationMemberId: string;
	}

	let { conferenceId, delegationMemberId }: Props = $props();

	const delegationMember = $derived(
		await client.liveQuery.delegationMember({
			__args: { id: delegationMemberId },
			id: true,
			isHeadDelegate: true,
			delegation: {
				id: true,
				school: true,
				experience: true,
				motivation: true,
				applied: true,
				members: { id: true },
				appliedForRoles: { id: true }
			}
		})
	);

	let userIsHeadDelegate = $derived(delegationMember.isHeadDelegate);
	// A primitive, so the child components' queries keyed by it only run again when it changes,
	// not on every live update of the membership.
	const delegationId = $derived(delegationMember.delegation.id);
	const applied = $derived(delegationMember.delegation.applied);

	let delegationPreferencesModalOpen = $state(false);

	let invitePeopleCompleted = $derived(
		delegationMember.delegation?.members?.length
			? delegationMember.delegation?.members?.length > 1
			: undefined
	);

	let answerQuestionaireCompleted = $derived(
		!!delegationMember.delegation?.school &&
			!!delegationMember.delegation?.motivation &&
			!!delegationMember.delegation?.experience
	);

	let enterDelegationPreferencesCompleted = $derived(
		(delegationMember.delegation.appliedForRoles?.length ?? 0) >= 3
	);

	let todos = $derived([
		{
			title: m.todoCreateDelegation(),
			completed: true
		},
		{
			title: m.todoInvitePeople(),
			completed: invitePeopleCompleted,
			help: m.todoInvitePeopleHelp()
		},
		{
			title: m.todoAnswerQuestionaire(),
			completed: answerQuestionaireCompleted,
			help: m.todoAnswerQuestionaireHelp()
		},
		{
			title: m.todoEnterDelegationPreferences(),
			completed: enterDelegationPreferencesCompleted,
			help: m.todoEnterDelegationPreferencesHelp()
		},
		{
			title: m.todoCompleteSignup(),
			completed: delegationMember.delegation?.applied,
			help: m.todoCompleteSignupHelp(),
			arrowDown:
				invitePeopleCompleted && answerQuestionaireCompleted && enterDelegationPreferencesCompleted
		}
	]);

	const stats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: delegationMember.delegation?.members?.length,
			desc: m.inTheDelegation()
		},
		{
			icon: 'list-check',
			title: m.tasks(),
			value: todos
				? `${Math.floor((todos.filter((x) => x.completed).length / todos.length) * 100)} %`
				: undefined,
			desc: m.doneToRegister()
		}
	]);

	const leaveDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.leaveDelegationConfirmation())) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegationMember({ __args: { id: delegationMember.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('/dashboard'));
	};

	const deleteDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.deleteDelegationConfirmation())) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegation({ __args: { id: delegationId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('/dashboard'));
	};

	const saveApplication = (answers: ApplicationAnswers) =>
		client.mutate.updateDelegation({ __args: { id: delegationId, ...answers }, id: true });

	const completeRegistration = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, applied: true },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

{#snippet preferences()}
	<DashboardContentCard
		title={m.delegationPreferences()}
		description={userIsHeadDelegate
			? m.delegationPreferencesDescriptionHeadDelegate()
			: m.delegationPreferencesDescriptionMember()}
		class="flex-1"
	>
		{#if delegationMember.delegation.appliedForRoles.length === 0}
			<div class="alert alert-warning">
				<i class="fas fa-exclamation-triangle text-3xl"></i>
				{m.noRoleApplications()}
			</div>
		{:else}
			<RoleApplicationTable {delegationId} {conferenceId} />
		{/if}
		{#if !applied}
			<div class="flex-1"></div>
			{#if userIsHeadDelegate}
				<button
					class="btn btn-primary mt-4"
					onclick={() => {
						delegationPreferencesModalOpen = true;
					}}
				>
					{m.setDelegationPreferences()}</button
				>
			{:else}
				<a class="btn btn-primary mt-4" href={resolve(`/dashboard/${conferenceId}/seats`)}>
					<i class="fas fa-arrow-right"></i>
					{m.conferenceSeats()}
				</a>
			{/if}
		{/if}
	</DashboardContentCard>
{/snippet}

<RegistrationStatusAlert {applied} pendingText={m.completeSignupWarningText()} />
<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationStatus()}</h2>
	<GenericWidget content={stats} />
	<DelegationNameDisplay {delegationId} />
</section>

<DelegationRegistrationMembers
	{conferenceId}
	{delegationId}
	delegationMemberId={delegationMember.id}
	{userIsHeadDelegate}
/>

<section>
	<h2 class="mb-2 text-2xl font-bold">{m.application()}</h2>
	<div class="mb-4 flex flex-col items-start justify-start gap-4 md:flex-row">
		<DashboardContentCard
			title={m.informationAndMotivation()}
			description={userIsHeadDelegate
				? m.informationAndMotivationDescriptionHeadDelegate()
				: m.informationAndMotivationDescriptionMember()}
			class="flex-1"
		>
			<!-- Seeded once from the row as it was on mount. The dashboard keys this component by
			registration, so a different one gets a fresh form. -->
			<ApplicationQuestionnaire
				initial={delegationMember.delegation}
				save={saveApplication}
				disabled={applied || !userIsHeadDelegate}
				showSubmitButton={!applied && userIsHeadDelegate}
				motivationLabel={m.whyDoYouWantToJoinTheConference()}
				experienceLabel={m.howMuchExperienceDoesYourDelegationHave()}
			/>
		</DashboardContentCard>
		{@render preferences()}
	</div>
	{#if !applied}
		<CompleteSignupCard
			description={userIsHeadDelegate
				? m.completeSignupDescriptionHeadDelegate()
				: m.completeSignupDescription()}
			{todos}
			forbidden={!userIsHeadDelegate}
			onComplete={completeRegistration}
		/>
	{/if}
</section>
<RegistrationDangerZone
	{applied}
	appliedText={m.noDangerZoneOptions()}
	supportIdHtml={m.delegationIdForSupport()}
	id={delegationId}
>
	{#if delegationMember.delegation.members.length > 1}
		<button class="btn btn-error" onclick={leaveDelegation}>{m.leaveDelegation()}</button>
	{/if}
	{#if userIsHeadDelegate}
		<button class="btn btn-error join-item" onclick={deleteDelegation}
			>{m.deleteDelegation()}</button
		>
	{/if}
</RegistrationDangerZone>

{#if delegationPreferencesModalOpen}
	<SelectDelegationPreferencesModal
		onClose={() => {
			delegationPreferencesModalOpen = false;
		}}
		{conferenceId}
		{delegationId}
	/>
{/if}
