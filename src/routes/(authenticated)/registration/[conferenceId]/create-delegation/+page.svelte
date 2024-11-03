<script lang="ts">
	import Steps from '$lib/components/Steps.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData, ActionData } from './$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { createDelegationFormSchema } from './form-schema';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { toast } from '@zerodevx/svelte-toast';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(createDelegationFormSchema),
		onResult({ result }) {
			switch (result.type) {
				case 'success':
          entryCode = result.data?.delegation?.entryCode
					step++;
					break;

				case 'error':
					toast.push(result.error.message);
					break;
				default:
          throw new Error('Unknown result type');
			}
		}
	});
	let step = $state(0);
	let formdata = $derived(form.form);
	let allErrors = $derived(form.allErrors);
	let tainted = $derived(form.tainted);
	let validateForm = $derived(form.validateForm);
	let isTainted = $derived(form.isTainted);

	let entryCode = $derived<string | undefined>(undefined);
	let referralLink = $derived(
		`${data.origin}/registration/${data.conferenceId}/join?code=${entryCode}`
	);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<header class="mb-20">
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

	<Form {form} showSubmitButton={false}>
		<div class="flex flex-col gap-6 text-center {step !== 0 ? 'hidden' : ''}">
			<h1 class="text-3xl uppercase tracking-wider">{m.createDelegation()}</h1>
			{@html m.createDelegationProcessExplaination()}
			<button class="btn btn-primary btn-lg" onclick={() => step++}>{m.next()}</button>
			<a class="btn btn-warning" href=".">{m.back()}</a>
		</div>
		<div class="flex flex-col gap-4 {step !== 1 ? 'hidden' : ''}">
			<p class="max-ch-sm">
				{m.pleaseAnswerTheFollowingQuestions()}
			</p>
			<FormTextInput
				{form}
				name="school"
				placeholder={m.answerHere()}
				label={m.whichSchoolDoesYourDelegationComeFrom()}
			/>
			<FormTextInput
				{form}
				name="motivation"
				placeholder={m.answerHere()}
				label={m.whyDoYouWantToJoinTheConference()}
			/>
			<FormTextInput
				{form}
				name="experience"
				placeholder={m.answerHere()}
				label={m.howMuchExperienceDoesYourDelegationHave()}
			/>
			<button
				class="btn btn-primary btn-lg"
				type="button"
				disabled={$allErrors.length > 0 || !isTainted($tainted)}
				onclick={async () => {
					const val = await validateForm({ update: true });
					if (val.valid) {
						step++;
					}
				}}>{m.next()}</button
			>
			<button class="btn btn-warning" onclick={() => step--}>{m.back()}</button>
		</div>
		<div class="flex flex-col items-center gap-4 {step !== 2 ? 'hidden' : ''}">
			<p class="max-ch-sm">{m.pleaseCheckYourAnswers()}</p>

			<div class="dark:stroke-slate-300 rounded-lg bg-base-100 p-4 shadow-lg dark:bg-base-200">
				<div class="overflow-x-auto">
					<table class="table">
						<tbody>
							<tr>
								<td>{m.schoolOrInstitution()}</td>
								<td class="max-ch-sm">{$formdata.school}</td>
							</tr>
							<tr>
								<td>{m.motivation()}</td>
								<td class="max-ch-sm">{$formdata.motivation}</td>
							</tr>
							<tr>
								<td>{m.experience()}</td>
								<td class="max-ch-sm">{$formdata.experience}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<button class="btn btn-primary btn-lg w-full" type="submit">{m.createDelegation()}</button>
			<button class="btn btn-warning w-full" type="button" onclick={() => step--}>{m.back()}</button
			>
		</div>
	</Form>
	<div class="flex w-full flex-col items-center gap-4 sm:w-auto {step !== 3 ? 'hidden' : ''}">
		<div role="alert" class="alert alert-success flex justify-center">
			<i class="fas fa-check"></i>
			<span>{m.delegationCreatedSuccessfully()}</span>
		</div>
		<p class="max-ch-sm">
			{m.nowYouCanInvitePeople()}
		</p>
		<div class="flex w-full items-center rounded-lg border-2 border-dashed border-primary p-2">
			<p class="flex-1 overflow-x-auto">
				{referralLink}
			</p>
			<button
				class="btn btn-ghost btn-primary"
				onclick={() => {
					navigator.clipboard.writeText(referralLink);
					alert(m.linkCopied());
				}}
				aria-label="Copy referral link"
				><i class="fa-duotone fa-clipboard text-xl"></i>
			</button>
		</div>
		<p class="max-ch-sm">
			{m.orShareThisCode()}
		</p>
		<div class="flex w-full items-center rounded-lg border-2 border-dashed border-primary p-2">
			<p class="flex-1 overflow-x-auto font-mono text-xl uppercase tracking-[0.6rem]">
				{entryCode}
			</p>
			<button
				class="btn btn-ghost btn-primary"
				onclick={() => {
					navigator.clipboard.writeText(entryCode as string);
					alert(m.codeCopied());
				}}
				aria-label="Copy entry code"
				><i class="fa-duotone fa-clipboard text-xl"></i>
			</button>
		</div>
		<a class="btn btn-primary btn-lg mt-10 w-full" href="/dashboard">{m.toDashboard()}</a>
	</div>
</div>
