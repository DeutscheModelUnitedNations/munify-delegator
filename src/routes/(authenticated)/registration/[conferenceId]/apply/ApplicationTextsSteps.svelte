<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { defaults } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import Form from '#lib/components/form/Form.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import { mutationForm } from '#lib/components/form/mutationForm.js';
	import { applicationFormSchema } from '#lib/schemata/applicationForm.js';
	import type { ApplicationAnswers } from '../../../dashboard/[conferenceId]/applicationForm';
	import FlowStep from './FlowStep.svelte';

	/**
	 * The questions every application answers, one step each, sent through whichever mutation
	 * applies once the last is answered.
	 */
	interface Props {
		/** The number of the first question's step, after those before them. */
		firstNumber: number;
		schoolLabel: string;
		motivationLabel: string;
		experienceLabel: string;
		submitLabel: string;
		submit: (answers: ApplicationAnswers) => Promise<unknown>;
	}

	let { firstNumber, schoolLabel, motivationLabel, experienceLabel, submitLabel, submit }: Props =
		$props();

	// One form across the steps; only the last step's button submits it.
	const form = mutationForm(
		defaults(
			{ schoolId: null, schoolName: '', motivation: '', experience: '' },
			zod4Client(applicationFormSchema)
		),
		zod4Client(applicationFormSchema),
		(answers) => submit(answers)
	);
	const { form: formData, submitting } = form;

	/** How many questions are answered: the step after them is the open one. */
	let answered = $state(0);

	async function confirm(field: 'schoolName' | 'motivation') {
		const errors = await form.validate(field, { update: true });
		if (!errors?.length) answered++;
	}

	const preview = (text: string | null | undefined) =>
		!text ? m.noAnswer() : text.length > 140 ? `${text.slice(0, 140)}…` : text;
</script>

{#snippet next(field: 'schoolName' | 'motivation')}
	<button class="btn btn-primary mt-4 self-end" type="button" onclick={() => confirm(field)}>
		{m.next()}
		<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
	</button>
{/snippet}

<FlowStep
	number={firstNumber}
	title={m.school()}
	summary={answered > 0 ? $formData.schoolName || m.noSchoolGiven() : undefined}
	onEdit={() => (answered = 0)}
	last={answered < 1}
	scrollIntoView
>
	<SchoolPicker
		{form}
		name="schoolName"
		idName="schoolId"
		label={schoolLabel}
		description={m.schoolPickerDescription()}
	/>
	{@render next('schoolName')}
</FlowStep>

{#if answered >= 1}
	<FlowStep
		number={firstNumber + 1}
		title={m.motivation()}
		summary={answered > 1 ? preview($formData.motivation) : undefined}
		onEdit={() => (answered = 1)}
		last={answered < 2}
		scrollIntoView
	>
		<FormTextArea {form} name="motivation" placeholder={m.answerHere()} label={motivationLabel} />
		{@render next('motivation')}
	</FlowStep>
{/if}

{#if answered >= 2}
	<FlowStep number={firstNumber + 2} title={m.experience()} last scrollIntoView>
		<Form {form} showSubmitButton={false}>
			<FormTextArea {form} name="experience" placeholder={m.answerHere()} label={experienceLabel} />
			<button class="btn btn-primary mt-4 self-end" type="submit" disabled={$submitting}>
				{#if $submitting}
					<span class="loading loading-spinner loading-sm"></span>
				{/if}
				{submitLabel}
				<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
			</button>
		</Form>
	</FlowStep>
{/if}
