<script lang="ts">
	import { untrack } from 'svelte';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { m } from '#lib/paraglide/messages.js';
	import { applicationTextsSchema } from '#lib/schemata/applicationForm.js';
	import Form from '#lib/components/form/Form.svelte';
	import { mutationForm } from '#lib/components/form/mutationForm.js';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import { makeApplicationForm, type ApplicationTexts } from '../../applicationForm';

	/**
	 * The motivation/experience questionnaire of a delegation's or a single participant's
	 * application, saved through `save`. The school is each person's own (`MySchool`).
	 */
	interface Props {
		/** The answers as they were on mount; following live updates would discard edits. */
		initial: Parameters<typeof makeApplicationForm>[0];
		save: (answers: ApplicationTexts) => Promise<unknown>;
		disabled: boolean;
		showSubmitButton: boolean;
		motivationLabel: string;
		experienceLabel: string;
	}

	let { initial, save, disabled, showSubmitButton, motivationLabel, experienceLabel }: Props =
		$props();

	const form = mutationForm(
		makeApplicationForm(untrack(() => initial)),
		zod4Client(applicationTextsSchema),
		(answers) => save(answers)
	);
</script>

<Form {form} {showSubmitButton}>
	<div class="flex flex-col gap-2">
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
