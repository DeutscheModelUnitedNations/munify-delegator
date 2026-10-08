<script lang="ts">
	import Steps from '$lib/components/Steps.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import Form from '$lib/components/form/Form.svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { toast } from 'svelte-sonner';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import type { Snippet } from 'svelte';
	import { qr } from '@svelte-put/qr/svg';
	import { client } from '$lib/api/rumbleClient/client';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);

	let step = $state(0);
	let entryCode = $state<string>();

	const form = superForm(
		defaults({ school: '', motivation: '', experience: '' }, zod4Client(applicationFormSchema)),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(applicationFormSchema),
			onError(e) {
				toast.error(e.result.error.message);
			},
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const delegation = await client.mutate.createDelegation({
					__args: { ...validated.data, conferenceId },
					id: true,
					entryCode: true
				});
				entryCode = delegation.entryCode;
				step++;
			}
		}
	);

	let referralLink = $derived(
		`${page.url.origin}/registration/${conferenceId}/join-delegation?code=${entryCode}`
	);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<header class="mb-20">
		<Steps
			currentStep={step}
			steps={[{ title: m.infos() }, { title: m.questionnaire() }, { title: m.invite() }]}
		/>
	</header>

	{#if step < 2}
		<div class="flex w-full max-w-lg flex-col gap-6 text-center">
			<h1 class="text-3xl tracking-wider uppercase">{m.createDelegation()}</h1>
			{#if step === 0}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
				{@html m.createDelegationProcessExplaination()}
				<button class="btn btn-primary btn-lg" type="button" onclick={() => step++}
					>{m.next()}</button
				>
				<a class="btn btn-warning" href={resolve(`/registration/${conferenceId}`)}>{m.back()}</a>
			{:else}
				<Form {form}>
					<p>
						{m.pleaseAnswerTheFollowingQuestions()}
					</p>
					<FormFieldset title={m.questionnaire()}>
						<FormTextInput
							{form}
							name="school"
							placeholder={m.answerHere()}
							label={m.whichSchoolDoesYourDelegationComeFrom()}
						/>
						<FormTextArea
							{form}
							name="motivation"
							placeholder={m.answerHere()}
							label={m.whyDoYouWantToJoinTheConference()}
						/>
						<FormTextArea
							{form}
							name="experience"
							placeholder={m.answerHere()}
							label={m.howMuchExperienceDoesYourDelegationHave()}
						/>
					</FormFieldset>
				</Form>
				<button class="btn btn-warning" type="button" onclick={() => step--}>{m.back()}</button>
			{/if}
		</div>
	{:else if step === 2}
		{#snippet CopyCard(content: Snippet, onclick?: () => void)}
			<div class="card bg-base-200 border-base-300 flex w-full flex-row items-center border p-2">
				{@render content()}
				{#if onclick}
					<button class="btn btn-ghost" type="button" {onclick} aria-label="Copy referral">
						<i class="fa-sharp-duotone fa-solid fa-clipboard text-xl"></i>
					</button>
				{/if}
			</div>
		{/snippet}

		<div class="flex w-full max-w-lg flex-col items-center gap-4">
			<div role="alert" class="alert alert-success flex justify-center">
				<i class="fas fa-check"></i>
				<span>{m.delegationCreatedSuccessfully()}</span>
			</div>
			<p>
				{m.nowYouCanInvitePeople()}
			</p>

			{#snippet ReferralLink()}
				<p class="flex-1 overflow-x-auto">
					{referralLink}
				</p>
			{/snippet}
			{@render CopyCard(ReferralLink, () => {
				navigator.clipboard.writeText(referralLink);
				toast.success(m.linkCopied());
			})}
			{#snippet QRCode()}
				<div class="flex w-full items-center justify-center">
					<svg use:qr={{ data: referralLink, shape: 'circle' }} class="max-w-32" />
				</div>
			{/snippet}
			{@render CopyCard(QRCode)}

			<p class="max-ch-sm">
				{m.orShareThisCode()}
			</p>

			{#snippet ReferralCode()}
				<p
					class="w-full flex-1 overflow-x-auto text-center font-mono text-xl tracking-[0.6rem] uppercase"
				>
					{entryCode}
				</p>
			{/snippet}
			{@render CopyCard(ReferralCode, () => {
				if (!entryCode) return;
				navigator.clipboard.writeText(entryCode);
				toast.success(m.codeCopied());
			})}
			<a
				class="btn btn-primary btn-lg mt-10 w-full"
				href={resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId })}
				>{m.toDashboard()}</a
			>
		</div>
	{/if}
</div>
