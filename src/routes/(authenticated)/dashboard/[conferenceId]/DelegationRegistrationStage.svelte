<script lang="ts">
	import type { PageData } from './$types';
	import TodoTable from '$lib/components/TodoTable.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { apiClient, checkForError } from '$api/client';
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import RoleApplicationTable from '$lib/components/RoleApplicationTable.svelte';
	import { error } from '@sveltejs/kit';
	import DashboardContentCard from '$lib/components/DashboardContentCard.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

	if (!data.delegationData) {
		error(404, 'Delegation not found');
	}

	let questionnaireValues = $state({
		school: '',
		motivation: '',
		experience: ''
	});

	let delegationPreferencesModalOpen = $state(false);

	onMount(async () => {
		questionnaireValues = {
			school: data.delegationData?.school ?? '',
			motivation: data.delegationData?.motivation ?? '',
			experience: data.delegationData?.experience ?? ''
		};
	});

	const userIsHeadDelegate = !!data.delegationMembershipData?.isHeadDelegate;

	let referralLink = $derived(
		`${data.url.origin}/registration/${data.conferenceId}/join?code=${data.delegationData?.entryCode}`
	);

	let todos = $derived([
		{
			title: m.todoCreateDelegation(),
			completed: true
		},
		{
			title: m.todoInvitePeople(),
			completed: data.delegationData?.members?.length
				? data.delegationData?.members?.length > 1
				: undefined,
			help: m.todoInvitePeopleHelp()
		},
		{
			title: m.todoAnswerQuestionaire(),
			completed:
				!!data.delegationData?.school &&
				!!data.delegationData?.motivation &&
				!!data.delegationData?.experience,
			help: m.todoAnswerQuestionaireHelp()
		},
		{
			title: m.todoEnterDelegationPreferences(),
			completed: data.delegationData.appliedForRoles?.length >= 3,
			help: m.todoEnterDelegationPreferencesHelp()
		},
		{
			title: m.todoCompleteSignup(),
			completed: data.delegationData?.applied,
			help: m.todoCompleteSignupHelp()
		}
	]);

	const stats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: data.delegationData?.members?.length,
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
		if (!data.delegationData) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.leaveDelegationConfirmation())) return;
		checkForError(api.delegation({ id: data.delegationData?.id }).leave.delete());
		invalidateAll();
	};

	const deleteDelegation = async () => {
		if (!data.delegationData) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.deleteDelegationConfirmation())) return;
		checkForError(api.delegation({ id: data.delegationData?.id }).delete());
		invalidateAll().then(() => goto('/dashboard'));
	};

	const makeHeadDelegate = async (userId: string) => {
		if (!data.delegationData) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.makeHeadDelegateConfirmation())) return;
		checkForError(
			api.delegation({ id: data.delegationData.id }).transferHeadDelegateship.patch({
				newHeadDelegateUserId: userId
			})
		);
		await invalidateAll();
	};

	const removeMember = async (memberId: string) => {
		if (!data.delegationData) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.removeMemberConfirmation())) return;
		checkForError(api.delegationMember({ id: memberId }).delete());
		await invalidateAll();
	};

	const completeRegistration = async () => {
		if (!data.delegationData) {
			console.error('Error: Delegation Data not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		checkForError(api.delegation({ id: data.delegationData.id }).completeRegistration.patch());
		await invalidateAll();
	};
</script>

{#if !data.delegationData?.applied}
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
	{#if Array.isArray(data.delegationData?.members) && data.delegationData.members.length > 0}
		<DelegationStatusTableWrapper title={m.activeMembers()}>
			{#each data.delegationData?.members as member}
				<DelegationStatusTableEntry
					name={`${member.user.given_name} ${member.user.family_name}`}
					pronouns={member.user.pronouns ?? ''}
					headDelegate={member.isHeadDelegate}
				>
					{#if userIsHeadDelegate && data.delegationData?.members.length > 1 && !data.delegationData?.applied}
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
		{#if data.delegationData?.supervisors.length > 0}
			<DelegationStatusTableWrapper
				title={m.supervisors()}
				description={m.supervisorDelegationDescription()}
			>
				{#each data.delegationData?.supervisors as supervisor}
					<DelegationStatusTableEntry
						name={`${supervisor.user.given_name} ${supervisor.user.family_name}`}
						pronouns={supervisor.user.pronouns ?? ''}
					/>
				{/each}
			</DelegationStatusTableWrapper>
		{/if}
		<DashboardContentCard
			title={!data.delegationData?.applied
				? m.inviteMorePeople()
				: m.inviteMorePeopleButAlreadyApplied()}
			description={!data.delegationData?.applied
				? m.inviteMorePeopleDescription()
				: m.inviteMorePeopleButAlreadyAppliedDescription()}
		>
			<div class="flex items-center bg-base-200 dark:bg-base-300 rounded-lg mt-4 p-2 pl-4 gap-2">
				<p class="overflow-x-auto uppercase font-mono text-xl tracking-[0.6rem]">
					{data.delegationData?.entryCode}
				</p>
				<button
					class="btn btn-ghost btn-primary btn-square"
					onclick={() => {
						navigator.clipboard.writeText(data.delegationData?.entryCode as string);
						alert(m.codeCopied());
					}}
					aria-label="Copy entry code"
					><i class="fa-duotone fa-clipboard text-xl"></i>
				</button>
				{#if !data.delegationData?.applied}
					<button
						class="btn btn-ghost btn-primary btn-square"
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
								class="btn btn-ghost btn-primary btn-square"
								onclick={async () => {
									await checkForError(
										api.delegation({ id: data.delegationData!.id }).resetEntryCode.patch()
									);
									invalidateAll();
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
		<div class="skeleton w-full h-60"></div>
	{/if}
</section>

<section>
	<h2 class="text-2xl font-bold mb-2">{m.application()}</h2>
	<div class="flex flex-col md:flex-row gap-4 mb-4">
		<DashboardContentCard
			title={m.informationAndMotivation()}
			description={userIsHeadDelegate
				? m.informationAndMotivationDescriptionHeadDelegate()
				: m.informationAndMotivationDescriptionMember()}
			class="flex-1"
		>
			<form
				class="flex flex-col gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					if (!data.delegationData) {
						console.error('Error: Delegation Data not found');
						return;
					}
					checkForError(
						api.delegation({ id: data.delegationData.id }).patch({
							school: questionnaireValues.school,
							motivation: questionnaireValues.motivation,
							experience: questionnaireValues.experience
						})
					);
					invalidateAll();
				}}
			>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text max-ch-sm text-left"
							>{m.whichSchoolDoesYourDelegationComeFrom()}</span
						>
					</div>
					<input
						type="text"
						placeholder={m.answerHere()}
						class="input input-bordered w-full input-sm"
						value={questionnaireValues.school}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.school = e.target.value;
						}}
						disabled={!userIsHeadDelegate || data.delegationData?.applied}
						required
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text max-ch-sm text-left">{m.whyDoYouWantToJoinTheConference()}</span
						>
					</div>
					<textarea
						placeholder={m.answerHere()}
						class="textarea textarea-bordered w-full textarea-sm"
						value={questionnaireValues.motivation}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.motivation = e.target.value;
						}}
						disabled={!userIsHeadDelegate || data.delegationData?.applied}
						required
					></textarea>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text max-ch-sm text-left"
							>{m.howMuchExperienceDoesYourDelegationHave()}</span
						>
					</div>
					<textarea
						placeholder={m.answerHere()}
						class="textarea textarea-bordered w-full textarea-sm"
						value={questionnaireValues.experience}
						oninput={(e) => {
							// @ts-expect-error
							questionnaireValues.experience = e.target.value;
						}}
						disabled={!userIsHeadDelegate || data.delegationData?.applied}
						required
					></textarea>
				</label>
				<div class="flex-1"></div>
				{#if !data.delegationData?.applied}
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
			{#if !data.delegationData?.appliedForRoles}
				<div class="skeleton w-full h-60"></div>
			{:else if data.delegationData.appliedForRoles.length === 0}
				<div class="alert alert-warning">
					<i class="fas fa-exclamation-triangle text-3xl"></i>
					{m.noRoleApplications()}
				</div>
			{:else}
				<RoleApplicationTable
					roleApplications={data.delegationData.appliedForRoles}
					committees={data.committees}
				/>
			{/if}
			{#if !data.delegationData?.applied}
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
	{#if !data.delegationData?.applied}
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
	<h2 class="text-2xl font-bold mb-4">{m.dangerZone()}</h2>
	{#if data.delegationData?.applied}
		<div class="alert alert-info">
			<i class="fas fa-exclamation-triangle text-3xl"></i>
			<p>{m.noDangerZoneOptions()}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#if data.delegationData?.members.length ?? 0 > 1}
				<button class="btn btn-error" onclick={leaveDelegation}>{m.leaveDelegation()}</button>
			{/if}
			{#if userIsHeadDelegate}
				<button class="btn btn-error join-item" onclick={deleteDelegation}
					>{m.deleteDelegation()}</button
				>
			{/if}
		</div>
	{/if}

	<p class="text-xs mt-10">
		{@html m.delegationIdForSupport()}
		{#if data.delegationData}
			<span class="font-mono p-1 bg-base-200 rounded-sm">{data.delegationData.id}</span>
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
