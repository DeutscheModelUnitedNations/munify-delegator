<script lang="ts">
	import type { PageData } from '../../$houdini';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import RoleApplicationTable from './RoleApplicationTable.svelte';
	import TodoTable from '$lib/components/Dashboard/TodoTable.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';
	import { graphql, type MyConferenceparticipationQuery$result } from '$houdini';
	import { cache } from '$houdini';
	import formatNames from '$lib/services/formatNames';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DelegationNameDisplay from '$lib/components/DelegationNameDisplay.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import toast from 'svelte-french-toast';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import EntryCode from '../Common/EntryCode.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { page } from '$app/state';

	//TODO we should split this up/refactor this
	// use some component queries instead of that monster load maybe?

	interface Props {
		delegationMember: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>;
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		applicationForm: PageData['applicationForm'];
	}

	let { delegationMember, conference, applicationForm }: Props = $props();

	let userIsHeadDelegate = $derived(delegationMember.isHeadDelegate);

	const form = superForm(applicationForm, {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(applicationFormSchema),
		onError: (e) => {
			toast.error(e.result.error.message);
		},
		onSubmit: async () => {
			await toast.promise(
				updateFieldMutation.mutate({
					where: { id: delegationMember.delegation.id },
					...$formData
				}),
				genericPromiseToastMessages
			);
			// TODO this is weird. When I invalidate the cache and make him refetch here, the form resets and the data is back to the old version. Fix this!
			cache.markStale();
			invalidateAll();
		}
	});
	let formData = $derived(form.form);

	let delegationPreferencesModalOpen = $state(false);

	let referralLink = $derived(
		`${page.url.origin}/registration/${conference.id}/join-delegation?code=${delegationMember.delegation.entryCode}`
	);

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

	const deleteMemberMutation = graphql(`
		mutation DeleteDelegationMemberMutation($where: DelegationMemberWhereUniqueInput!) {
			deleteOneDelegationMember(where: $where) {
				id
			}
		}
	`);

	const deleteDelegationMutation = graphql(`
		mutation DeleteDelegationMutation($where: DelegationWhereUniqueInput!) {
			deleteOneDelegation(where: $where) {
				id
			}
		}
	`);

	//TODO we should use the where/data input ways for all resolvers to prevent these kinds of mutations
	const makeHeadDelegateMutation = graphql(`
		mutation MakeHeadDelegateMutation($where: DelegationWhereUniqueInput!, $userId: ID!) {
			updateOneDelegation(where: $where, newHeadDelegateUserId: $userId) {
				id
				members {
					id
					isHeadDelegate
				}
			}
		}
	`);

	const applyMutation = graphql(`
		mutation SetDelegationAppliedMutation($where: DelegationWhereUniqueInput!) {
			updateOneDelegation(where: $where, applied: true) {
				id
			}
		}
	`);

	const updateFieldMutation = graphql(`
		mutation UpdateDelegationFieldsMutation(
			$where: DelegationWhereUniqueInput!
			$experience: String
			$motivation: String
			$school: String
		) {
			updateOneDelegation(
				where: $where
				experience: $experience
				motivation: $motivation
				school: $school
			) {
				id
			}
		}
	`);

	const resetEntryCodeMutation = graphql(`
		mutation ResetEntryCodeMutation($where: DelegationWhereUniqueInput!) {
			updateOneDelegation(where: $where, resetEntryCode: true) {
				id
				entryCode
			}
		}
	`);

	const leaveDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.leaveDelegationConfirmation())) return;
		await toast.promise(
			deleteMemberMutation.mutate({ where: { id: delegationMember.id } }),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
		goto('/dashboard');
	};

	const deleteDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.deleteDelegationConfirmation())) return;
		await toast.promise(
			deleteDelegationMutation.mutate({ where: { id: delegationMember.delegation.id } }),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
		goto('/dashboard');
	};

	const makeHeadDelegate = async (userId: string) => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.makeHeadDelegateConfirmation())) return;
		await toast.promise(
			makeHeadDelegateMutation.mutate({
				where: { id: delegationMember.delegation.id },
				userId
			}),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
	};

	const removeMember = async (memberId: string) => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.removeMemberConfirmation())) return;
		await toast.promise(
			deleteMemberMutation.mutate({ where: { id: memberId } }),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
	};

	const completeRegistration = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		await toast.promise(
			applyMutation.mutate({ where: { id: delegationMember.delegation.id } }),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
	};
</script>

{#if !delegationMember.delegation?.applied}
	<section role="alert" class="alert alert-warning w-full">
		<i class="fas fa-exclamation-triangle text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.completeSignupWarningHeading()}</p>
			<p class="mt-2">
				{m.completeSignupWarningText()}
			</p>
		</div>
	</section>
{:else}
	<section role="alert" class="alert alert-success w-full">
		<i class="fas fa-circle-check text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.completeSignupSuccess()}</p>
			<p class="mt-2">
				{m.completeSignupSuccessDescription()}
			</p>
		</div>
	</section>
{/if}
<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationStatus()}</h2>
	<GenericWidget content={stats} />
	<DelegationNameDisplay delegationId={delegationMember.delegation.id} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	{#if Array.isArray(delegationMember.delegation?.members) && delegationMember.delegation.members.length > 0}
		<DelegationStatusTableWrapper title={m.activeMembers()}>
			{#each delegationMember.delegation.members as member}
				<DelegationStatusTableEntry
					name={formatNames(member.user.given_name, member.user.family_name)}
					pronouns={member.user.pronouns ?? ''}
					headDelegate={member.isHeadDelegate}
				>
					{#if userIsHeadDelegate && delegationMember.delegation?.members.length > 1 && !delegationMember.delegation?.applied}
						<div class="tooltip tooltip-left" data-tip={m.makeHeadDelegate()}>
							<SquareButtonWithLoadingState
								cssClass="btn-warning"
								icon="medal"
								duotone={false}
								disabled={member.isHeadDelegate}
								onClick={async () => makeHeadDelegate(member.user.id)}
							/>
						</div>
						<div class="tooltip tooltip-left" data-tip={m.removeMember()}>
							<SquareButtonWithLoadingState
								cssClass="btn-error"
								icon="trash"
								duotone={false}
								disabled={member.isHeadDelegate}
								onClick={async () => removeMember(member.id)}
							/>
						</div>
					{/if}
				</DelegationStatusTableEntry>
			{/each}
		</DelegationStatusTableWrapper>
		{#if !delegationMember.delegation?.applied}
			<DashboardContentCard
				title={m.inviteMorePeople()}
				description={m.inviteMorePeopleDescription()}
			>
				<EntryCode
					entryCode={delegationMember.delegation.entryCode}
					{referralLink}
					userHasRotationPermission={userIsHeadDelegate}
					rotationFn={async () => {
						await toast.promise(
							resetEntryCodeMutation.mutate({
								where: { id: delegationMember.delegation.id }
							}),
							{ ...genericPromiseToastMessages, success: m.codeRotated() }
						);
						cache.markStale();
						await invalidateAll();
					}}
				/>
			</DashboardContentCard>
		{/if}
		<SupervisorTable supervisors={delegationMember.supervisors} conferenceId={conference.id} />
	{:else}
		<div class="skeleton h-60 w-full"></div>
	{/if}
</section>

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
			<Form
				{form}
				showSubmitButton={!delegationMember.delegation?.applied && delegationMember.isHeadDelegate}
			>
				<FormFieldset title={m.questionnaire()}>
					<FormTextInput
						name="school"
						label={m.whichSchoolDoesYourDelegationComeFrom()}
						{form}
						placeholder={m.answerHere()}
						type="text"
						disabled={delegationMember.delegation.applied || !delegationMember.isHeadDelegate}
					/>
					<FormTextArea
						name="motivation"
						label={m.whyDoYouWantToJoinTheConference()}
						{form}
						placeholder={m.answerHere()}
						disabled={delegationMember.delegation.applied || !delegationMember.isHeadDelegate}
					/>
					<FormTextArea
						name="experience"
						label={m.howMuchExperienceDoesYourDelegationHave()}
						{form}
						placeholder={m.answerHere()}
						disabled={delegationMember.delegation.applied || !delegationMember.isHeadDelegate}
					/>
				</FormFieldset>
			</Form>
		</DashboardContentCard>
		<DashboardContentCard
			title={m.delegationPreferences()}
			description={userIsHeadDelegate
				? m.delegationPreferencesDescriptionHeadDelegate()
				: m.delegationPreferencesDescriptionMember()}
			class="flex-1"
		>
			{#if !delegationMember.delegation?.appliedForRoles}
				<div class="skeleton h-60 w-full"></div>
			{:else if delegationMember.delegation.appliedForRoles.length === 0}
				<div class="alert alert-warning">
					<i class="fas fa-exclamation-triangle text-3xl"></i>
					{m.noRoleApplications()}
				</div>
			{:else}
				<RoleApplicationTable
					roleApplications={delegationMember.delegation.appliedForRoles}
					committees={conference.committees}
				/>
			{/if}
			{#if !delegationMember.delegation?.applied}
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
					<a class="btn btn-primary mt-4" href="/seats/{conference.id}" target="_blank">
						<i class="fas fa-arrow-up-right-from-square"></i>
						{m.conferenceSeats()}
					</a>
				{/if}
			{/if}
		</DashboardContentCard>
	</div>
	{#if !delegationMember.delegation?.applied}
		<DashboardContentCard
			title={m.completeSignup()}
			description={userIsHeadDelegate
				? m.completeSignupDescriptionHeadDelegate()
				: m.completeSignupDescription()}
		>
			<TodoTable {todos} />
			<button
				class="btn btn-success mt-4"
				disabled={todos.filter((x) => x.completed === false).length > 1 || !userIsHeadDelegate}
				onclick={completeRegistration}
			>
				{m.completeSignupButton()}
			</button>
		</DashboardContentCard>
	{/if}
</section>
<section>
	<h2 class="mb-4 text-2xl font-bold">{m.dangerZone()}</h2>
	{#if delegationMember.delegation?.applied}
		<div class="alert alert-info">
			<i class="fas fa-exclamation-triangle text-3xl"></i>
			<p>{m.noDangerZoneOptions()}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#if delegationMember.delegation?.members.length ?? 0 > 1}
				<button class="btn btn-error" onclick={leaveDelegation}>{m.leaveDelegation()}</button>
			{/if}
			{#if userIsHeadDelegate}
				<button class="btn btn-error join-item" onclick={deleteDelegation}
					>{m.deleteDelegation()}</button
				>
			{/if}
		</div>
	{/if}

	<p class="mt-10 text-xs">
		{@html m.delegationIdForSupport()}
		{#if delegationMember.delegation}
			<span class="bg-base-200 rounded-sm p-1 font-mono">{delegationMember.delegation.id}</span>
		{:else}
			<span class="loading-dots"></span>
		{/if}
	</p>
</section>

<SelectDelegationPreferencesModal
	open={delegationPreferencesModalOpen}
	onClose={() => {
		delegationPreferencesModalOpen = false;
	}}
	{conference}
	{delegationMember}
/>
