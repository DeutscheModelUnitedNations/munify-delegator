<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import GenericWidget from '$lib/components/delegationStats/GenericWidget.svelte';
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import type { ApplicationAnswers } from '../../applicationForm';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import ApplicationQuestionnaire from '../Common/ApplicationQuestionnaire.svelte';
	import CompleteSignupCard from '../Common/CompleteSignupCard.svelte';
	import RegistrationDangerZone from '../Common/RegistrationDangerZone.svelte';
	import RegistrationStatusAlert from '../Common/RegistrationStatusAlert.svelte';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
	}

	let { conferenceId, singleParticipantId }: Props = $props();

	const singleParticipant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			school: true,
			motivation: true,
			experience: true,
			applied: true,
			appliedForRoles: { id: true, name: true, description: true, fontAwesomeIcon: true }
		})
	);

	const applied = $derived(singleParticipant.applied);
	/** The last application cannot be withdrawn on its own; that is what deleting them all is for. */
	const isOnlyApplication = $derived(singleParticipant.appliedForRoles.length === 1);

	const saveApplication = (answers: ApplicationAnswers) =>
		client.mutate.updateSingleParticipant({
			__args: { id: singleParticipantId, ...answers },
			id: true
		});

	const completeRegistration = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.completeSignupConfirmation())) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipant.id, applied: true },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const deleteAllApplications = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteAllApplicationsConfirmation())) return;

		const promise = Promise.resolve(
			client.mutate.deleteSingleParticipant({ __args: { id: singleParticipant.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('/dashboard'));
	};

	const deleteApplication = async (id: string) => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!confirm(m.deleteApplicationConfirmation())) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipant.id, unApplyForRolesIdList: [id] },
			id: true,
			appliedForRoles: { id: true }
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
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
			help: m.todoCompleteSignupHelp(),
			arrowDown:
				!!singleParticipant.school &&
				!!singleParticipant.motivation &&
				!!singleParticipant.experience
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

<RegistrationStatusAlert {applied} pendingText={m.completeSignupWarningTextSingleParticipant()} />
<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.status()}</h2>
	<GenericWidget content={stats} />
	<SupervisorTable singleParticipantId={singleParticipant.id} {conferenceId} />
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
					{#each singleParticipant.appliedForRoles as role (role.id)}
						<tr>
							<td>
								<div class="flex items-center gap-4">
									{#if role.fontAwesomeIcon}
										<i
											class="fa-sharp-duotone fa-solid fa-{role.fontAwesomeIcon.replace(
												'fa-',
												''
											)} text-xl"
										></i>
									{/if}
									{role.name}
								</div>
							</td>
							<td>{role.description}</td>
							{#if !applied}
								<td>
									<SquareButtonWithLoadingState
										cssClass={isOnlyApplication ? 'opacity-10' : ''}
										disabled={isOnlyApplication}
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
		{#if !applied}
			<a
				class="btn btn-primary btn-wide mt-4"
				href={resolve(`/registration/${conferenceId}/individual`)}
			>
				<i class="fa-sharp-duotone fa-solid fa-plus"></i>
				{m.addAnotherApplication()}
			</a>
		{/if}
	</DashboardContentCard>
</section>

<section>
	<h2 class="mb-2 text-2xl font-bold">{m.application()}</h2>
	<div class="mb-4 flex flex-col gap-4 md:flex-row">
		<DashboardContentCard
			title={m.informationAndMotivation()}
			description={m.informationAndMotivationDescriptionHeadDelegate()}
			class="flex-1"
		>
			<!-- Seeded once from the row as it was on mount. The dashboard keys this component by
			registration, so a different one gets a fresh form. -->
			<ApplicationQuestionnaire
				initial={singleParticipant}
				save={saveApplication}
				disabled={applied}
				showSubmitButton={!applied}
				motivationLabel={m.whyDoYouWantToJoinTheConferenceSingleParticipant()}
				experienceLabel={m.howMuchExperienceDoesYourDelegationHaveSingleParticipant()}
			/>
		</DashboardContentCard>
	</div>
	{#if !applied}
		<CompleteSignupCard
			description={m.completeSignupDescriptionHeadDelegate()}
			{todos}
			onComplete={completeRegistration}
		/>
	{/if}
</section>
<RegistrationDangerZone
	{applied}
	appliedText={m.noDangerZoneOptionsSingleParticipants()}
	supportIdHtml={m.singleParticipantsIdForSupport()}
	id={singleParticipant.id}
>
	<button class="btn btn-error" onclick={deleteAllApplications}>{m.deleteAllApplications()}</button>
</RegistrationDangerZone>
