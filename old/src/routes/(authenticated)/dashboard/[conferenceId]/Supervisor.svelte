<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import { apiClient, checkForError } from '$api/client';
	import { invalidateAll } from '$app/navigation';
	import { getApi } from '$lib/global/apiState.svelte';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{
			icon: 'flag',
			title: 'Delegationen',
			value: data.supervisorsDelegationData?.length,
			desc: 'in der Konferenz'
		},
		{
			icon: 'users',
			title: 'Mitglieder',
			value: data.supervisorsDelegationData?.reduce((acc, cur) => acc + cur.members.length, 0),
			desc: 'in allen Delegationen'
		}
	]);

	const getName = (user: any, shortenGiven = false) => {
		if (shortenGiven) {
			return `${user.given_name.charAt(0)}. ${user.family_name}`;
		}
		return `${user.given_name} ${user.family_name}`;
	};

	const handlePresenceChange = async (e: Event) => {
		if (!data.supervisorData) return;
		await checkForError(
			getApi().conferenceSupervisor({ id: data.supervisorData.id }).patch({
				plansOwnAttendenceAtConference: (e.target as HTMLInputElement).checked
			})
		);
		invalidateAll();
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
	<div class="card p-6 shadow-md max-w-80 bg-base-100 dark:bg-base-200">
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={data.supervisorData?.plansOwnAttendenceAtConference}
					onchange={handlePresenceChange}
				/>
			</label>
		</div>
	</div>
	<p class="text-xs text-gray-500">
		{@html data.supervisorData?.plansOwnAttendenceAtConference
			? m.willBePresentAtConference()
			: m.willNotBePresentAtConference()}
	</p>
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegations()}</h2>
	{#if data.supervisorsDelegationData && data.supervisorsDelegationData.length > 0}
		<div class="flex flex-col sm:flex-row gap-2 sm:gap-8">
			<div class="text-sm">
				<i class="fa-solid fa-hourglass-half text-warning"></i>
				<span> = {m.notApplied()}</span>
			</div>
			<div class="text-sm">
				<i class="fa-solid fa-circle-check text-success"></i>
				<span> = {m.applied()}</span>
			</div>
		</div>
		{#each data.supervisorsDelegationData as delegation, index}
			<div
				tabindex="-1"
				class="collapse p-4 bg-base-100 hover:bg-base-200 dark:bg-base-200 dark:hover:bg-base-300 shadow-md transition-colors duration-300"
			>
				<input type="radio" name="supervisor-accordion-1" checked={index === 0} />
				<div class="collapse-title text-xl text-nowrap font-medium flex flex-col sm:flex-row">
					<div class="flex items-center mb-6 sm:mb-0">
						<div>
							{#if delegation.applied}
								<i class="fa-solid fa-circle-check text-success text-3xl"></i>
							{:else}
								<i class="fa-solid fa-hourglass-half text-warning text-3xl"></i>
							{/if}
						</div>
						<div class="divider divider-horizontal"></div>
						<div><i class="fa-duotone fa-fingerprint mr-4"></i>{delegation.entryCode}</div>
					</div>
					<div class="divider hidden sm:flex divider-horizontal"></div>
					<div class="flex items-center">
						<div><i class="fa-duotone fa-users mr-4"></i>{delegation.members.length}</div>
						<div class="divider divider-horizontal"></div>
						<div>
							<i class="fa-duotone fa-medal mr-4"></i>{getName(
								delegation?.members.find((x) => x.isHeadDelegate)?.user,
								true
							)}
						</div>
					</div>
				</div>
				<div class="collapse-content overflow-x-auto">
					<div class="mt-10 text-sm grid grid-cols-[1fr] sm:grid-cols-[auto_1fr] gap-x-4">
						<div class="font-bold">{m.members()}</div>
						<div class="w-full mb-4">
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
						<div class="mb-4">{delegation.experience}</div>
						<div class="font-bold">{m.delegationPreferences()}</div>
						<div class="flex flex-wrap gap-1">
							{#if delegation.appliedForRoles.length > 0}
								{#each delegation.appliedForRoles as roleApplication}
									<div class="flex gap-2">
										<div class="badge bg-base-300">
											{roleApplication.nation
												? countryCodeToLocalName(roleApplication.nation.alpha3Code)
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
	<a class="mt-4 btn btn-wide btn-ghost" href="/registration/{data.conferenceId}/supervisor">
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
