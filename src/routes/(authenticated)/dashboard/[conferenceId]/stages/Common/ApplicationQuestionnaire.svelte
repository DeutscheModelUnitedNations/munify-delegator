<script lang="ts">
	import { untrack } from 'svelte';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { m } from '#lib/paraglide/messages.js';
	import { applicationFormSchema } from '#lib/schemata/applicationForm.js';
	import Form from '#lib/components/form/Form.svelte';
	import { mutationForm } from '#lib/components/form/mutationForm.js';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
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
		schoolLabel: string;
		motivationLabel: string;
		experienceLabel: string;
	}

	let {
		initial,
		save,
		disabled,
		showSubmitButton,
		schoolLabel,
		motivationLabel,
		experienceLabel
	}: Props = $props();

	const form = mutationForm(
		makeApplicationForm(untrack(() => initial)),
		zod4Client(applicationFormSchema),
		(answers) => save(answers)
	);
</script>

<Form {form} {showSubmitButton}>
	<div class="flex flex-col gap-2">
		<SchoolPicker
			{form}
			name="schoolName"
			idName="schoolId"
			label={schoolLabel}
			description={m.schoolPickerDescription()}
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
	</div>
</Form>
