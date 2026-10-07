<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import Form from '$lib/components/form/Form.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import { makeApplicationForm, type ApplicationAnswers } from '../../applicationForm';

	/**
	 * The school/motivation/experience questionnaire of a delegation's or a single participant's
	 * application, saved through `save`.
	 */
	interface Props {
		/** The answers as they were on mount; following live updates would discard edits. */
		initial: Parameters<typeof makeApplicationForm>[0];
		save: (answers: ApplicationAnswers) => Promise<unknown>;
		disabled: boolean;
		showSubmitButton: boolean;
		motivationLabel: string;
		experienceLabel: string;
	}

	let { initial, save, disabled, showSubmitButton, motivationLabel, experienceLabel }: Props =
		$props();

	const form = superForm(makeApplicationForm(untrack(() => initial)), {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(applicationFormSchema),
		onError: (e) => {
			toast.error(e.result.error.message);
		},
		async onUpdate({ form: validated }) {
			if (!validated.valid) return;
			const promise = save(validated.data);
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		}
	});
</script>

<Form {form} {showSubmitButton}>
	<FormFieldset title={m.questionnaire()}>
		<FormTextInput
			name="school"
			label={m.whichSchoolDoesYourDelegationComeFrom()}
			{form}
			placeholder={m.answerHere()}
			type="text"
			{disabled}
		/>
		<FormTextArea
			name="motivation"
			label={motivationLabel}
			{form}
			placeholder={m.answerHere()}
			{disabled}
		/>
		<FormTextArea
			name="experience"
			label={experienceLabel}
			{form}
			placeholder={m.answerHere()}
			{disabled}
		/>
	</FormFieldset>
</Form>
