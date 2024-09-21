<script lang="ts">
	import { fly } from 'svelte/transition';
	import Steps from '$lib/components/RegistrationSteps.svelte';
	import ReviewTable from '$lib/components/ReviewTable.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import type { Delegation } from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
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
			href: `/registration/${data.conferenceId}/create`,
			title: m.createDelegation(),
			icon: 'plus'
		}
	];

	let step = $state(1);
	let delegation = $state<Partial<Delegation>>({});
	let referralLink = $derived(
		`${data.url.origin}/registration/${data.conference.id}/join?code=${delegation?.entryCode}`
	);

	const nextStep = async (create = false) => {
		if (create) {
			console.log('Creating delegation', delegation);
			const createdDelegation = await checkForError(
				api.delegation.post({
					conference: {
						connect: {
							id: data.conference.id
						}
					},
					experience: delegation.experience!,
					motivation: delegation.motivation!,
					school: delegation.school!
				})
			);
			delegation = createdDelegation;
		}

		step += 1;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		});
	};

	const prevStep = () => {
		step -= 1;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		});
	};
</script>

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<header>
		<RegistrationBreadcrumbs {breadcrumbs} />
		<div class="h-10"></div>
		<Steps
			currentStep={step}
			steps={[
				{ title: m.infos() },
				{ title: m.questionnaire() },
				{ title: m.review() },
				{ title: m.invite() }
			]}
		/>
	</header>
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.createDelegation()}</h1>
		{#if step === 1}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-6"
			>
				{@html m.createDelegationProcessExplaination()}
				<button class="btn btn-lg btn-primary" onclick={() => nextStep()}>{m.next()}</button>
				<a class="btn btn-warning" href=".">{m.back()}</a>
			</div>
		{:else if step === 2}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4"
			>
				<p class="max-ch-sm">
					{m.pleaseAnswerTheFollowingQuestions()}
				</p>
				<form
					class="contents"
					onsubmit={(e) => {
						e.preventDefault();
						nextStep();
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
							oninput={(e: any) => (delegation.school = e.target.value)}
						/>
					</label>
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>{m.whyDoYouWantToJoinTheConference()}</span
							>
						</div>
						<textarea
							placeholder={m.answerHere()}
							class="textarea textarea-bordered w-full"
							oninput={(e: any) => (delegation.motivation = e.target.value)}
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
							oninput={(e: any) => (delegation.experience = e.target!.value)}
						></textarea>
					</label>
					<button class="btn btn-lg btn-primary" type="submit">{m.next()}</button>
				</form>
				<button class="btn btn-warning" onclick={prevStep}>{m.back()}</button>
			</div>
		{:else if step === 3}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4 items-center"
			>
				<p class="max-ch-sm">{m.pleaseCheckYourAnswers()}</p>

				<ReviewTable>
					<tr>
						<td>{m.conference()}</td>
						<td class="max-ch-sm">{data.conference.title}</td>
					</tr>
					<tr>
						<td>{m.schoolOrInstitution()}</td>
						<td class="max-ch-sm">{delegation.school ?? m.willBeSetLater()}</td>
					</tr>
					<tr>
						<td>{m.motivation()}</td>
						<td class="max-ch-sm">{delegation.motivation ?? m.willBeSetLater()}</td>
					</tr>
					<tr>
						<td>{m.experience()}</td>
						<td class="max-ch-sm">{delegation.experience ?? m.willBeSetLater()}</td>
					</tr>
				</ReviewTable>
				<button class="btn btn-lg btn-primary w-full" onclick={() => nextStep(true)}
					>{m.createDelegation()}</button
				>
				<button class="btn btn-warning w-full" onclick={prevStep}>{m.back()}</button>
			</div>
		{:else if step === 4}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4 items-center w-full sm:w-auto"
			>
				<div role="alert" class="alert alert-success flex justify-center">
					<i class="fas fa-check"></i>
					<span>{m.delegationCreatedSuccessfully()}</span>
				</div>
				<p class="max-ch-sm">
					{m.nowYouCanInvitePeople()}
				</p>
				<div class="flex items-center border-2 border-dashed border-primary rounded-lg p-2 w-full">
					<p class="flex-1 overflow-x-auto">
						{referralLink}
					</p>
					<button
						class="btn btn-ghost btn-primary"
						onclick={() => {
							navigator.clipboard.writeText(referralLink);
							alert(m.linkCopied());
						}}
						><i class="fa-duotone fa-clipboard text-xl"></i>
					</button>
				</div>
				<p class="max-ch-sm">
					{m.orShareThisCode()}
				</p>
				<div class="flex items-center border-2 border-dashed border-primary rounded-lg p-2 w-full">
					<p class="flex-1 overflow-x-auto uppercase font-mono text-xl tracking-[0.6rem]">
						{delegation?.entryCode}
					</p>
					<button
						class="btn btn-ghost btn-primary"
						onclick={() => {
							navigator.clipboard.writeText(delegation.entryCode as string);
							alert(m.codeCopied());
						}}
						><i class="fa-duotone fa-clipboard text-xl"></i>
					</button>
				</div>
				<a class="btn btn-lg btn-primary w-full mt-10" href="/dashboard">{m.toDashboard()}</a>
			</div>
		{/if}
	</main>
</div>
