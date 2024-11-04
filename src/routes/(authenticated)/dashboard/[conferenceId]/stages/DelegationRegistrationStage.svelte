<script lang="ts">
	import type { PageData } from '../$houdini';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import DelegationStatusTableWrapper from '$lib/components/Dashboard/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/Dashboard/DelegationStatusTable/Entry.svelte';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
  import RoleApplicationTable from './RoleApplicationTable.svelte';
	import TodoTable from '$lib/components/Dashboard/TodoTable.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';
	import { graphql } from '$houdini';
	import type { StoresValues } from 'svelte/store';
	import { page } from '$app/stores';

  //TODO we should split this up/refactor this
	// use some component queries instead of that monster load maybe?

	let {
		data
	}: {
		data: Pick<
			NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']>,
			'findUniqueConference' | 'findUniqueDelegationMember'
		> &
			Pick<PageData, 'user'>;
	} = $props();

	let delegationMember = $derived(data.findUniqueDelegationMember!);
	let conference = $derived(data.findUniqueConference!);

	//TODO we should use forms for this
	let questionnaireValues = $state({
		school: '',
		motivation: '',
		experience: ''
	});

	let delegationPreferencesModalOpen = $state(false);

	onMount(async () => {
		questionnaireValues = {
			school: delegationMember.delegation?.school ?? '',
			motivation: delegationMember.delegation?.motivation ?? '',
			experience: delegationMember.delegation?.experience ?? ''
		};
	});

	const userIsHeadDelegate = $derived(!!delegationMember.isHeadDelegate);

	let referralLink = $derived(
		`${$page.url.origin}/registration/${conference.id}/join?code=${delegationMember.delegation.entryCode}`
	);

	let todos = $derived([
		{
			title: m.todoCreateDelegation(),
			completed: true
		},
		{
			title: m.todoInvitePeople(),
			completed: delegationMember.delegation?.members?.length
				? delegationMember.delegation?.members?.length > 1
				: undefined,
			help: m.todoInvitePeopleHelp()
		},
		{
			title: m.todoAnswerQuestionaire(),
			completed:
				!!delegationMember.delegation?.school &&
				!!delegationMember.delegation?.motivation &&
				!!delegationMember.delegation?.experience,
			help: m.todoAnswerQuestionaireHelp()
		},
		{
			title: m.todoEnterDelegationPreferences(),
			completed: (delegationMember.delegation.appliedForRoles?.length ?? 0) >= 3,
			help: m.todoEnterDelegationPreferencesHelp()
		},
		{
			title: m.todoCompleteSignup(),
			completed: delegationMember.delegation?.applied,
			help: m.todoCompleteSignupHelp()
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

	const resetEntryCodeMutation = graphql(`
		mutation ResetEntryCodeMutation($where: DelegationWhereUniqueInput!) {
			updateOneDelegation(where: $where, resetEntryCode: true) {
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

	const leaveDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.leaveDelegationConfirmation())) return;
		await deleteMemberMutation.mutate({ where: { id: delegationMember.id } });
	};

	const deleteDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.deleteDelegationConfirmation())) return;
		await deleteDelegationMutation.mutate({ where: { id: delegationMember.delegation.id } });
		goto('/dashboard');
	};

	const makeHeadDelegate = async (userId: string) => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.makeHeadDelegateConfirmation())) return;
		await makeHeadDelegateMutation.mutate({
			where: { id: delegationMember.delegation.id },
			userId
		});
	};

	const removeMember = async (memberId: string) => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.removeMemberConfirmation())) return;
		await deleteMemberMutation.mutate({ where: { id: memberId } });
	};

	const completeRegistration = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		await applyMutation.mutate({ where: { id: delegationMember.delegation.id } });
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
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	{#if Array.isArray(delegationMember.delegation?.members) && delegationMember.delegation.members.length > 0}
		<DelegationStatusTableWrapper title={m.activeMembers()}>
			{#each delegationMember.delegation.members as member}
				<DelegationStatusTableEntry
					name={`${member.user.given_name} ${member.user.family_name}`}
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
		{#if delegationMember.delegation?.supervisors.length > 0}
			<DelegationStatusTableWrapper
				title={m.supervisors()}
				description={m.supervisorDelegationDescription()}
			>
				{#each delegationMember.delegation?.supervisors as supervisor}
					<DelegationStatusTableEntry
						name={`${supervisor.user.given_name} ${supervisor.user.family_name}`}
						pronouns={supervisor.user.pronouns ?? ''}
					/>
				{/each}
			</DelegationStatusTableWrapper>
		{/if}
		<DashboardContentCard
			title={!delegationMember.delegation?.applied
				? m.inviteMorePeople()
				: m.inviteMorePeopleButAlreadyApplied()}
			description={!delegationMember.delegation?.applied
				? m.inviteMorePeopleDescription()
				: m.inviteMorePeopleButAlreadyAppliedDescription()}
		>
			<div class="mt-4 flex items-center gap-2 rounded-lg bg-base-200 p-2 pl-4 dark:bg-base-300">
				<p class="overflow-x-auto font-mono text-xl uppercase tracking-[0.6rem]">
					{delegationMember.delegation?.entryCode}
				</p>
				<button
					class="btn btn-square btn-ghost btn-primary"
					onclick={() => {
						navigator.clipboard.writeText(delegationMember?.delegation?.entryCode as string);
						alert(m.codeCopied());
					}}
					aria-label="Copy entry code"
					><i class="fa-duotone fa-clipboard text-xl"></i>
				</button>
				{#if !delegationMember.delegation?.applied}
					<button
						class="btn btn-square btn-ghost btn-primary"
						onclick={() => {
							navigator.clipboard.writeText(referralLink as string);
							alert(m.linkCopied());
						}}
						aria-label="Copy referral link"
						><i class="fa-duotone fa-link text-xl"></i>
					</button>
					{#if userIsHeadDelegate}
						<div class="tooltip" data-tip={m.rotateCode()}>
							<button
								class="btn btn-square btn-ghost btn-primary"
								onclick={async () => {
									await resetEntryCodeMutation.mutate({
										where: { id: delegationMember.delegation.id }
									});
									alert(m.codeRotated());
								}}
								aria-label="Rotate entry code"
								><i class="fa-duotone fa-rotate text-xl"></i>
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</DashboardContentCard>
	{:else}
		<div class="skeleton h-60 w-full"></div>
	{/if}
</section>

<section>
	<h2 class="mb-2 text-2xl font-bold">{m.application()}</h2>
	<div class="mb-4 flex flex-col gap-4 md:flex-row">
		<DashboardContentCard
			title={m.informationAndMotivation()}
			description={userIsHeadDelegate
				? m.informationAndMotivationDescriptionHeadDelegate()
				: m.informationAndMotivationDescriptionMember()}
			class="flex-1"
		>
			<form
				class="flex flex-col gap-4"
				onsubmit={async (e) => {
					e.preventDefault();
					if (!delegationMember.delegation) {
						console.error('Error: Delegation Data not found');
						return;
					}
					await updateFieldMutation.mutate({
						where: { id: delegationMember.delegation.id },
						school: questionnaireValues.school,
						motivation: questionnaireValues.motivation,
						experience: questionnaireValues.experience
					});
				}}
			>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm"
							>{m.whichSchoolDoesYourDelegationComeFrom()}</span
						>
					</div>
					<input
						type="text"
						placeholder={m.answerHere()}
						class="input input-sm input-bordered w-full"
						value={questionnaireValues.school}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.school = e.target.value;
						}}
						disabled={!userIsHeadDelegate || delegationMember.delegation?.applied}
						required
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm">{m.whyDoYouWantToJoinTheConference()}</span
						>
					</div>
					<textarea
						placeholder={m.answerHere()}
						class="textarea textarea-bordered textarea-sm w-full"
						value={questionnaireValues.motivation}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.motivation = e.target.value;
						}}
						disabled={!userIsHeadDelegate || delegationMember.delegation?.applied}
						required
					></textarea>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm"
							>{m.howMuchExperienceDoesYourDelegationHave()}</span
						>
					</div>
					<textarea
						placeholder={m.answerHere()}
						class="textarea textarea-bordered textarea-sm w-full"
						value={questionnaireValues.experience}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.experience = e.target.value;
						}}
						disabled={!userIsHeadDelegate || delegationMember.delegation?.applied}
						required
					></textarea>
				</label>
				<div class="flex-1"></div>
				{#if !delegationMember.delegation?.applied}
					<button class="btn btn-primary" type="submit" disabled={!userIsHeadDelegate}>
						{m.save()}
					</button>
				{/if}
			</form>
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
				<button
					class="btn btn-primary mt-4"
					disabled={!userIsHeadDelegate}
					onclick={() => {
						delegationPreferencesModalOpen = true;
					}}
				>
					{true ? m.setDelegationPreferences() : m.changeDelegationPreferences()}</button
				>
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
			<span class="rounded-sm bg-base-200 p-1 font-mono"
				>{delegationMember.delegation.id}</span
			>
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
	{data}
/>
