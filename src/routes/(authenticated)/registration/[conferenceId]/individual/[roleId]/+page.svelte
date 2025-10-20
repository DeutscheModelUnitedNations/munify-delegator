<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import toast from 'svelte-french-toast';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4(applicationFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		}
	});
	let role = $derived(data.role);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<Form {form} class="w-full max-w-lg">
		<h1 class="text-3xl tracking-wider uppercase">{role.name}</h1>
		<p>
			{m.pleaseAnswerTheFollowingQuestions()}
		</p>
		<FormFieldset title={m.questionnaire()}>
			<FormTextInput
				{form}
				name="school"
				placeholder={m.answerHere()}
				label={m.whichSchoolAreYouFrom()}
			/>
			<FormTextArea
				{form}
				name="motivation"
				placeholder={m.answerHere()}
				label={m.singleApplicationMotivation()}
			/>
			<FormTextArea
				{form}
				name="experience"
				placeholder={m.answerHere()}
				label={m.singleApplicationExperience()}
			/>
		</FormFieldset>
	</Form>
	<a class="btn btn-warning mt-8" type="button" href=".">{m.back()}</a>
</div>
