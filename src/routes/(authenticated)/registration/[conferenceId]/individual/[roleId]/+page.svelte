<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { individualApplicationFormSchema } from './form-schema';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { toast } from '@zerodevx/svelte-toast';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(individualApplicationFormSchema),
		onResult({ result }) {
			switch (result.type) {
				case 'success':
					goto('/dashboard');
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
	let role = $derived(data.role);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<Form {form} showSubmitButton={false}>
		<div class="flex flex-col gap-4 {step !== 0 ? 'hidden' : ''}">
			<h1 class="text-3xl uppercase tracking-wider">{role.name}</h1>
			<p class="max-ch-sm">
				{m.pleaseAnswerTheFollowingQuestions()}
			</p>
			<FormTextInput
				{form}
				name="school"
				placeholder={m.answerHere()}
				label={m.whichSchoolAreYouFrom()}
			/>
			<FormTextInput
				{form}
				name="motivation"
				placeholder={m.answerHere()}
				label={m.singleApplicationMotivation()}
			/>
			<FormTextInput
				{form}
				name="experience"
				placeholder={m.answerHere()}
				label={m.singleApplicationExperience()}
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
		<div class="flex flex-col items-center gap-4 {step !== 1 ? 'hidden' : ''}">
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

			<button class="btn btn-primary btn-lg w-full" type="submit">{m.submit()}</button>
			<button class="btn btn-warning w-full" type="button" onclick={() => step--}>{m.back()}</button
			>
		</div>
	</Form>
</div>
