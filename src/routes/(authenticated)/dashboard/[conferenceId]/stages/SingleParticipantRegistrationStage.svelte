<script lang="ts">
	import type { PageData } from '../$houdini';
	import { m } from '$lib/paraglide/messages';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import TodoTable from '$lib/components/Dashboard/TodoTable.svelte';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { cache, graphql, type MyConferenceparticipationQuery$result } from '$houdini';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import SupervisorTable from './SupervisorTable.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import toast from 'svelte-french-toast';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';

	interface Props {
		singleParticipant: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueSingleParticipant']
		>;
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		applicationForm: any;
	}

	let { singleParticipant, conference, applicationForm }: Props = $props();

	const form = superForm(applicationForm, {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zodClient(applicationFormSchema),
		onError: (e) => {
			toast.error(e.result.error.message);
		},
		onSubmit: async () => {
			await toast.promise(
				updateMutation.mutate({
					where: { id: singleParticipant.id },
					...$formData
				}),
				genericPromiseToastMessages
			);
			cache.markStale();
			await invalidateAll();
		}
	});
	let formData = $derived(form.form);

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
		await toast.promise(
			updateMutation.mutate({
				where: { id: singleParticipant.id },
				applied: true
			}),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
	};

	const deleteAllApplications = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteAllApplicationsConfirmation())) return;

		await toast.promise(
			deleteMutation.mutate({
				where: { id: singleParticipant.id }
			}),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
		goto('/dashboard');
	};

	const deleteApplication = async (id: string) => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteApplicationConfirmation())) return;
		await toast.promise(
			updateMutation.mutate({
				where: { id: singleParticipant.id },
				unApplyForRolesIdList: [id]
			}),
			genericPromiseToastMessages
		);
		cache.markStale();
		await invalidateAll();
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
	<h2 class="text-2xl font-bold">{m.status()}</h2>
	<GenericWidget content={stats} />
	<SupervisorTable supervisors={singleParticipant.supervisors} conferenceId={conference.id} />
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
			<Form {form} showSubmitButton={false}>
				<FormTextInput
					name="school"
					label={m.whichSchoolDoesYourDelegationComeFrom()}
					{form}
					placeholder={m.answerHere()}
					type="text"
					disabled={singleParticipant.applied}
				/>
				<FormTextArea
					name="motivation"
					label={m.whyDoYouWantToJoinTheConferenceSingleParticipant()}
					{form}
					placeholder={m.answerHere()}
					disabled={singleParticipant.applied}
				/>
				<FormTextArea
					name="experience"
					label={m.howMuchExperienceDoesYourDelegationHaveSingleParticipant()}
					{form}
					placeholder={m.answerHere()}
					disabled={singleParticipant.applied}
				/>
				<div class="flex-1"></div>
				{#if !singleParticipant.applied}
					<button class="btn btn-primary" type="submit">
						{m.save()}
					</button>
				{/if}
			</Form>
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
			<span class="bg-base-200 rounded-sm p-1 font-mono">{singleParticipant.id}</span>
		{:else}
			<span class="loading-dots"></span>
		{/if}
	</p>
</section>
