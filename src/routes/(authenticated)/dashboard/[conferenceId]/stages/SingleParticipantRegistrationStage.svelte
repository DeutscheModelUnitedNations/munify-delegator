<script lang="ts">
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import TodoTable from '$lib/components/Dashboard/TodoTable.svelte';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { graphql } from '$houdini';
	import type { StoresValues } from 'svelte/store';

	let {
		data
	}: {
		data: NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']> &
			Pick<PageData, 'user'>;
	} = $props();

	let singleParticipant = $derived(data.findUniqueSingleParticipant!);
	let conference = $derived(data.findUniqueConference!);

	//TODO: We should use forms for this
	let questionnaireValues = $state({
		school: '',
		motivation: '',
		experience: ''
	});

	onMount(async () => {
		questionnaireValues = {
			school: singleParticipant.school ?? '',
			motivation: singleParticipant.motivation ?? '',
			experience: singleParticipant.experience ?? ''
		};
	});

	const updateMutation = graphql(`
		mutation UpdateSingleParticipantMutation(
			$where: SingleParticipantWhereUniqueInput!
			$applied: Boolean
			$applyForRolesIdList: [ID!]
			$unApplyForRolesIdList: [ID!]
			$experience: String
			$school: String
			$motivation: String
		) {
			updateOneSingleParticipant(
				where: $where
				applied: $applied
				applyForRolesIdList: $applyForRolesIdList
				experience: $experience
				school: $school
				motivation: $motivation
				unApplyForRolesIdList: $unApplyForRolesIdList
			) {
				id
				applied
				appliedForRoles {
					id
				}
			}
		}
	`);

	const deleteMutation = graphql(`
		mutation DeleteSingleParticipantMutation($where: SingleParticipantWhereUniqueInput!) {
			deleteOneSingleParticipant(where: $where) {
				id
			}
		}
	`);

	const completeRegistration = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		await updateMutation.mutate({
			where: { id: singleParticipant.id },
			applied: true
		});
	};

	const deleteAllApplications = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteAllApplicationsConfirmation())) return;

		await deleteMutation.mutate({
			where: { id: singleParticipant.id }
		});
		goto('/dashboard');
	};

	const deleteApplication = async (id: string) => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteApplicationConfirmation())) return;
		await updateMutation.mutate({
			where: { id: singleParticipant.id },
			unApplyForRolesIdList: [id]
		});
		goto('/dashboard');
	};

	let todos = $derived([
		{
			title: m.todoApplyForRole(),
			completed: true,
			help: m.todoApplyForRoleHelp()
		},
		{
			title: m.todoAnswerQuestionaire(),
			completed:
				!!singleParticipant.school &&
				!!singleParticipant.motivation &&
				!!singleParticipant.experience,
			help: m.todoAnswerQuestionaireHelp()
		},
		{
			title: m.todoCompleteSignup(),
			completed: singleParticipant.applied,
			help: m.todoCompleteSignupHelp()
		}
	]);

	const stats = $derived([
		{
			icon: 'check-to-slot',
			title: m.roleApplications(),
			value: singleParticipant.appliedForRoles?.length,
			desc: m.atThisConference()
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
	$inspect(singleParticipant);
</script>

{#if !singleParticipant.applied}
	<section role="alert" class="alert alert-warning w-full">
		<i class="fas fa-exclamation-triangle text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.completeSignupWarningHeading()}</p>
			<p class="mt-2">
				{m.completeSignupWarningTextSingleParticipant()}
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

<section>
	<h2 class="mb-2 text-2xl font-bold">{m.roleApplications()}</h2>
	<DashboardContentCard>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>{m.role()}</th>
						<th>{m.description()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each singleParticipant!.appliedForRoles as role}
						<tr>
							<td>
								<div class="flex items-center gap-4">
									{#if role.fontAwesomeIcon}
										<i class="fa-duotone fa-{role.fontAwesomeIcon.replace('fa-', '')} text-xl"></i>
									{/if}
									{role.name}
								</div>
							</td>
							<td>{role.description}</td>
							{#if !singleParticipant.applied}
								<td>
									<SquareButtonWithLoadingState
										cssClass="btn-error {(singleParticipant.applied ||
											singleParticipant.appliedForRoles.length === 1) &&
											'opacity-10'}"
										disabled={singleParticipant.applied ||
											singleParticipant.appliedForRoles.length === 1}
										icon="trash"
										onClick={async () => deleteApplication(role.id)}
									/>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</DashboardContentCard>
	<a class="btn btn-ghost btn-wide mt-4" href="/registration/{conference.id}/individual">
		<i class="fa-solid fa-plus"></i>
		{m.addAnotherApplication()}
	</a>
</section>

<section>
	<h2 class="mb-2 text-2xl font-bold">{m.application()}</h2>
	<div class="mb-4 flex flex-col gap-4 md:flex-row">
		<DashboardContentCard
			title={m.informationAndMotivation()}
			description={m.informationAndMotivationDescriptionHeadDelegate()}
			class="flex-1"
		>
			<form
				class="flex flex-col gap-4"
				onsubmit={async (e) => {
					e.preventDefault();
					if (!singleParticipant) {
						console.error('Error: Single Participant Data not found');
						return;
					}
					await updateMutation.mutate({
						where: { id: singleParticipant.id },
						school: questionnaireValues.school,
						motivation: questionnaireValues.motivation,
						experience: questionnaireValues.experience
					});
				}}
			>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm">{m.whichSchoolDoYouComeFrom()}</span>
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
						disabled={singleParticipant.applied}
						required
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm"
							>{m.whyDoYouWantToJoinTheConferenceSingleParticipant()}</span
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
						disabled={singleParticipant.applied}
						required
					></textarea>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text text-left max-ch-sm"
							>{m.howMuchExperienceDoesYourDelegationHaveSingleParticipant()}</span
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
						disabled={singleParticipant.applied}
						required
					></textarea>
				</label>
				<div class="flex-1"></div>
				<!-- this was data.delegationData previously, is this correct? -->
				{#if !singleParticipant.applied}
					<button class="btn btn-primary" type="submit">
						{m.save()}
					</button>
				{/if}
			</form>
		</DashboardContentCard>
	</div>
	{#if !singleParticipant.applied}
		<DashboardContentCard
			title={m.completeSignup()}
			description={m.completeSignupDescriptionHeadDelegate()}
		>
			<TodoTable {todos} />
			<button
				class="btn btn-success mt-4"
				disabled={todos.filter((x) => x.completed === false).length > 1}
				onclick={completeRegistration}
			>
				{m.completeSignupButton()}
			</button>
		</DashboardContentCard>
	{/if}
</section>
<section>
	<h2 class="mb-4 text-2xl font-bold">{m.dangerZone()}</h2>
	{#if singleParticipant.applied}
		<div class="alert alert-info">
			<i class="fas fa-exclamation-triangle text-3xl"></i>
			<p>{m.noDangerZoneOptionsSingleParticipants()}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<button class="btn btn-error" onclick={deleteAllApplications}
				>{m.deleteAllApplications()}</button
			>
		</div>
	{/if}

	<p class="mt-10 text-xs">
		{@html m.singleParticipantsIdForSupport()}
		{#if singleParticipant}
			<span class="rounded-sm bg-base-200 p-1 font-mono">{singleParticipant.id}</span>
		{:else}
			<span class="loading-dots"></span>
		{/if}
	</p>
</section>
