<script lang="ts">
	import type { PageData } from './$types';
	import TodoTable from '$lib/components/TodoTable.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import { apiClient, checkForError } from '$api/client';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

	let questionnaireValues = $state({
		school: '',
		motivation: '',
		experience: ''
	});

	onMount(async () => {
		questionnaireValues = {
			school: data.delegationData.school,
			motivation: data.delegationData.motivation,
			experience: data.delegationData.experience
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
			completed: data.delegationData?.members?.length > 1 ?? undefined,
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
			completed: false,
			help: m.todoEnterDelegationPreferencesHelp()
		}
	]);

	const stats = $derived([
		{
			icon: 'users',
			title: 'Mitglieder',
			value: data.delegationData?.members?.length,
			desc: 'in der Delegation'
		},
		{
			icon: 'list-check',
			title: 'Aufgaben',
			value: todos
				? `${Math.floor((todos.filter((x) => x.completed).length / todos.length) * 100)} %`
				: undefined,
			desc: 'für Anmeldung erledigt'
		}
	]);
</script>

<section role="alert" class="alert alert-warning w-full">
	<i class="fas fa-exclamation-triangle text-3xl"></i>
	<div class="flex flex-col">
		<p class="font-bold">{m.completeSignupWarningHeading()}</p>
		<p class="mt-2">
			{m.completeSignupWarningText()}
		</p>
	</div>
</section>
<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationStatus()}</h2>
	<GenericWidget content={stats} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	{#if Array.isArray(data.delegationData?.members) && data.delegationData.members.length > 0}
		<DelegationStatusTableWrapper>
			{#each data.delegationData?.members as member}
				<DelegationStatusTableEntry
					name={`${member.user.given_name} ${member.user.family_name}`}
					headDelegate={member.isHeadDelegate}
				/>
			{/each}
		</DelegationStatusTableWrapper>
		<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<h3 class="text-xl">{m.inviteMorePeople()}</h3>
			<p>{m.inviteMorePeopleDescription()}</p>
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
					><i class="fa-duotone fa-clipboard text-xl"></i>
				</button>
				<button
					class="btn btn-ghost btn-primary btn-square"
					onclick={() => {
						navigator.clipboard.writeText(referralLink as string);
						alert(m.linkCopied());
					}}
					><i class="fa-duotone fa-link text-xl"></i>
				</button>
			</div>
		</div>
	{:else}
		<div class="skeleton w-full h-60"></div>
	{/if}
</section>

<section>
	<h2 class="text-2xl font-bold mb-2">{m.application()}</h2>
	<div class="flex flex-col md:flex-row gap-4">
		<div class="flex-1 card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<h3 class="text-xl">{m.informationAndMotivation()}</h3>
			<p>
				{userIsHeadDelegate
					? m.informationAndMotivationDescriptionHeadDelegate()
					: m.informationAndMotivationDescriptionMember()}
			</p>
			<form
				class="flex flex-col gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					checkForError(
						api.delegation({ id: data.delegationData.id }).patch({
							body: {
								school: questionnaireValues.school,
								motivation: questionnaireValues.motivation,
								experience: questionnaireValues.experience
							}
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
						class="input input-bordered w-full"
						value={questionnaireValues.school}
						oninput={(e) => (questionnaireValues.school = e.target!.value)}
						disabled={!userIsHeadDelegate}
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
						class="textarea textarea-bordered w-full"
						value={questionnaireValues.motivation}
						oninput={(e) => (questionnaireValues.motivation = e.target!.value)}
						disabled={!userIsHeadDelegate}
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
						class="textarea textarea-bordered w-full"
						value={questionnaireValues.experience}
						oninput={(e) => (questionnaireValues.experience = e.target!.value)}
						disabled={!userIsHeadDelegate}
						required
					></textarea>
				</label>
				<div class="flex-1"></div>
				<button class="btn btn-primary" type="submit" disabled={!userIsHeadDelegate}>
					{m.save()}
				</button>
			</form>
		</div>
		<div class="flex-1 card bg-base-100 dark:bg-base-200 shadow-md p-4">
			<h3 class="text-xl">{m.delegationPreferences()}</h3>
			<p>
				{userIsHeadDelegate
					? m.delegationPreferencesDescriptionHeadDelegate()
					: m.delegationPreferencesDescriptionMember()}
			</p>
			<table class="table">
				<thead>
					<tr>
						<th class="text-center"><i class="fa-duotone fa-hashtag"></i></th>
						<th class="text-center"><i class="fa-duotone fa-flag"></i></th>
						<th><i class="fa-duotone fa-text"></i></th>
						<th class="text-center"><i class="fa-duotone fa-users"></i></th>
					</tr>
				</thead>
				<tbody>
					{#each ['de', 'fr'] as country, index}
						<tr>
							<td class="text-center">{index + 1}</td>
							<td class="text-center"><Flag countryCode={country} size="xs" /></td>
							<td class="w-full">{countryCodeToLocalName(country, 'de')}</td>
							<td class="center">3</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="flex-1"></div>
			<button class="btn btn-primary mt-4"
				>{true ? m.setDelegationPreferences() : m.changeDelegationPreferences()}</button
			>
		</div>
	</div>
	<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4 mt-4">
		<h3 class="text-xl">{m.completeSignup()}</h3>
		<p>{m.completeSignupDescription()}</p>
		<TodoTable {todos} />
		<button
			class="btn btn-warning mt-4"
			disabled={todos.filter((x) => x.completed === false).length > 0 ?? true}
		>
			{m.completeSignupButton()}
		</button>
	</div>
</section>
<section>
	<h2 class="text-2xl font-bold mb-4">{m.dangerZone()}</h2>
	<div class="flex flex-col gap-2">
		<button class="btn btn-error">{m.leaveDelegation()}</button>
		{#if userIsHeadDelegate}
			<div class="join join-vertical">
				<button class="btn btn-error join-item">{m.transferHeadDelegateship()}</button>
				<button class="btn btn-error join-item">{m.deleteDelegation()}</button>
			</div>
		{/if}
	</div>
	<p class="text-xs mt-10">
		{@html m.delegationIdForSupport()}
		{#if data.delegationData}
			<span class="font-mono p-1 bg-base-200 rounded-sm">{data.delegationData.id}</span>
		{:else}
			<span class="loading-dots"></span>
		{/if}
	</p>
</section>
