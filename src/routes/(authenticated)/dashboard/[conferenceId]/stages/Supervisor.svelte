<script lang="ts">
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { graphql } from '$houdini';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';

	// TODO these components need some refactoring
	let {
		data
	}: {
		data: Pick<
			NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']>,
			'findUniqueConference' | 'findUniqueConferenceSupervisor'
		> &
			Pick<PageData, 'user'>;
	} = $props();

	let supervisor = $derived(data.findUniqueConferenceSupervisor!);
	let conference = $derived(data.findUniqueConference!);

	const stats = $derived([
		{
			icon: 'flag',
			title: m.delegations(),
			value: supervisor.delegations.length,
			desc: m.inTheConference()
		},
		{
			icon: 'users',
			title: m.members(),
			value: supervisor.delegations.reduce((acc, cur) => acc + cur.members.length, 0),
			desc: m.inAllDelegations()
		}
	]);

	const getName = (
		user: NonNullable<typeof supervisor>['delegations'][0]['members'][0]['user'],
		shortenGiven = false
	) => {
		if (shortenGiven) {
			return `${user.given_name.charAt(0)}. ${user.family_name}`;
		}
		return `${user.given_name} ${user.family_name}`;
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
		updateQuery.mutate({
			where: {
				conferenceId_userId: {
					conferenceId: conference.id,
					userId: data.user.sub
				}
			},
			data: {
				plansOwnAttendenceAtConference: (e.target as HTMLInputElement).checked
			}
		});
	};
</script>

<section class="alert alert-info">
	<i class="fa-solid fa-circle-info text-xl"></i>
	{m.registeredAsSupervisor()}
</section>

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

{#if conference.state !== 'PARTICIPANT_REGISTRATION'}
	<TasksWrapper>
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

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegations()}</h2>
	{#if supervisor && supervisor.delegations.length > 0}
		<div class="flex flex-col gap-2 sm:flex-row sm:gap-8">
			<div class="text-sm">
				<i class="fa-solid fa-hourglass-half text-warning"></i>
				<span> = {m.notApplied()}</span>
			</div>
			<div class="text-sm">
				<i class="fa-solid fa-circle-check text-success"></i>
				<span> = {m.applied()}</span>
			</div>
		</div>
		{#each supervisor.delegations as delegation, index}
			<div
				tabindex="-1"
				class="collapse bg-base-100 p-4 shadow-md transition-colors duration-300 hover:bg-base-200 dark:bg-base-200 dark:hover:bg-base-300"
			>
				<input type="radio" name="supervisor-accordion-1" checked={index === 0} />
				<div class="collapse-title flex flex-col text-nowrap text-xl font-medium sm:flex-row">
					<div class="mb-6 flex items-center sm:mb-0">
						<div>
							{#if delegation.applied}
								<i class="fa-solid fa-circle-check text-3xl text-success"></i>
							{:else}
								<i class="fa-solid fa-hourglass-half text-3xl text-warning"></i>
							{/if}
						</div>
						<div class="divider divider-horizontal"></div>
						<div><i class="fa-duotone fa-fingerprint mr-4"></i>{delegation.entryCode}</div>
					</div>
					<div class="divider divider-horizontal hidden sm:flex"></div>
					<div class="flex items-center">
						<div><i class="fa-duotone fa-users mr-4"></i>{delegation.members.length}</div>
						<div class="divider divider-horizontal"></div>
						<div>
							<i class="fa-duotone fa-medal mr-4"></i>{getName(
								delegation!.members.find((x) => x.isHeadDelegate)!.user!,
								true
							)}
						</div>
					</div>
				</div>
				<div class="collapse-content overflow-x-auto">
					<div class="mt-10 grid grid-cols-[1fr] gap-x-4 text-sm sm:grid-cols-[auto_1fr]">
						<div class="font-bold">{m.members()}</div>
						<div class="mb-4 w-full">
							{delegation.members.map((x) => getName(x.user)).join(', ')}
						</div>
						<div class="font-bold">{m.supervisors()}</div>
						<div class="mb-4">{delegation.supervisors.map((x) => getName(x.user)).join(', ')}</div>
						<div class="font-bold">{m.delegationStatus()}</div>
						<div class="mb-4">
							{#if delegation.applied}
								<span class="badge badge-success">{m.applied()}</span>
							{:else}
								<span class="badge badge-warning">{m.notApplied()}</span>
							{/if}
						</div>
						<div class="font-bold">{m.schoolOrInstitution()}</div>
						<div class="mb-4">{delegation.school}</div>
						<div class="font-bold">{m.experience()}</div>
						<div class="mb-4">{delegation.experience}</div>
						<div class="font-bold">{m.motivation()}</div>
						<div class="mb-4">{delegation.motivation}</div>
						<div class="font-bold">{m.delegationPreferences()}</div>
						<div class="flex flex-wrap gap-1">
							{#if delegation.appliedForRoles.length > 0}
								{#each delegation.appliedForRoles as roleApplication}
									<div class="flex gap-2">
										<div class="badge bg-base-300">
											{roleApplication.nation
												? getFullTranslatedCountryNameFromISO3Code(
														roleApplication.nation.alpha3Code
													)
												: roleApplication.nonStateActor?.name}
										</div>
									</div>
								{/each}
							{:else}{m.noRoleApplications()}
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div class="alert alert-warning">
			<i class="fa-solid fa-exclamation-triangle text-xl"></i>
			{m.noDelegationsFound()}
		</div>
	{/if}
	<a
		class="btn btn-ghost btn-wide mt-4"
		href="/registration/{conference.id}/join-delegation-supervisor"
	>
		<i class="fa-solid fa-plus"></i>
		{m.addAnotherDelegation()}
	</a>
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.singleParticipants()}</h2>
	<div class="alert alert-info">
		<i class="fa-solid fa-exclamation-triangle text-xl"></i>
		{m.noSingleApplicationTrackingYet()}
	</div>
</section>
