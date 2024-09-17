<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import type { SingleParticipant } from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
	import { goto } from '$app/navigation';
	import RegistrationBreadcrumbs from '$lib/components/RegistrationBreadcrumbs.svelte';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

	const breadcrumbs = [
		{ href: '/registration', icon: 'user-plus' },
		{
			href: `/registration/${data.conferenceId}`,
			title: data.conferenceData.title
		},
		{
			href: `/registration/${data.conferenceId}/individual`,
			icon: 'square-1'
		},
		{
			href: `/registration/${data.conferenceId}/individual/${data.role.id}`,
			title: data.role.name,
			icon: data.role.fontAwesomeIcon?.replace('fa-', '')
		}
	];

	let singleParticipant = $state<Pick<SingleParticipant, 'experience' | 'motivation' | 'school'>>({
		experience: data.existingSingleParticipant?.experience ?? '',
		motivation: data.existingSingleParticipant?.motivation ?? '',
		school: data.existingSingleParticipant?.school ?? ''
	});

	async function submit() {
		await checkForError(
			api.singleParticipant['add-self-application'].post({
				conference: {
					connect: {
						id: data.conferenceId
					}
				},
				...singleParticipant,
				appliedForRoles: {
					connect: [
						{
							id: data.role.id
						}
					]
				}
			})
		);
		goto('/dashboard');
	}
</script>

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{data.role.name}</h1>
		<div
			in:fly={{ x: 50, duration: 300, delay: 300 }}
			out:fly={{ x: -50, duration: 300 }}
			class="flex flex-col gap-4"
		>
			{#if !data.existingSingleParticipant?.school || !data.existingSingleParticipant?.motivation || !data.existingSingleParticipant?.experience}
				<p class="max-ch-sm">
					{m.pleaseAnswerTheFollowingQuestions()}
				</p>
			{:else}
				<p class="max-ch-sm">
					{m.alreadyAnsweredAllQuestions()}
				</p>
			{/if}

			<form
				class="contents"
				onsubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				{#if !data.existingSingleParticipant?.school}
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
							bind:value={singleParticipant.school}
						/>
					</label>
				{/if}
				{#if !data.existingSingleParticipant?.motivation}
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>{m.whyDoYouWantToJoinTheConference()}</span
							>
						</div>
						<textarea
							placeholder={m.answerHere()}
							class="textarea textarea-bordered w-full"
							bind:value={singleParticipant.motivation}
						></textarea>
					</label>
				{/if}
				{#if !data.existingSingleParticipant?.experience}
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>{m.howMuchExperienceDoesYourDelegationHave()}</span
							>
						</div>
						<textarea
							placeholder={m.answerHere()}
							class="textarea textarea-bordered w-full"
							bind:value={singleParticipant.experience}
						></textarea>
					</label>
				{/if}
				<button class="btn btn-lg btn-primary" type="submit">{m.submit()}</button>
			</form>
		</div>
	</main>
</div>
