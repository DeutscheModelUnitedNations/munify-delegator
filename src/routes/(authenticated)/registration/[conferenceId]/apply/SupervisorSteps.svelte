<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import FlowStep from './FlowStep.svelte';

	/** Signing up as a supervisor: the school first, then whether they attend themselves. */
	interface Props {
		conferenceId: string;
		/** The number of the first of the two steps, after those before them. */
		firstNumber: number;
	}

	let { conferenceId, firstNumber }: Props = $props();

	// The superform only holds the school picker's two fields; the signup itself is a plain handler,
	// since a `goto` after superforms' own submit does not navigate.
	const form = superForm(
		defaults({ schoolId: null, schoolName: '' }, zod4Client(schoolChoiceSchema)),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(schoolChoiceSchema)
		}
	);
	const { form: formData } = form;

	let schoolChosen = $state(false);
	let attends = $state<boolean>();
	let submitting = $state(false);

	const attendanceChoices = $derived([
		{
			attends: true,
			icon: 'person-walking-luggage',
			title: m.supervisorAttendsTitle(),
			text: m.supervisorAttendsText()
		},
		{
			attends: false,
			icon: 'laptop-house',
			title: m.supervisorRemoteTitle(),
			text: m.supervisorRemoteText()
		}
	]);

	function confirmSchool() {
		if (!schoolChoiceSchema.safeParse($formData).success) {
			toast.error(m.schoolNameTooLong());
			return;
		}
		schoolChosen = true;
	}

	async function signup() {
		const school = schoolChoiceSchema.safeParse($formData);
		if (!school.success || attends === undefined) return;
		submitting = true;
		try {
			const promise = client.mutate.createConferenceSupervisor({
				__args: { conferenceId, plansOwnAttendenceAtConference: attends, ...school.data },
				id: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await goto(resolve(`dashboard/${conferenceId}`));
		} finally {
			submitting = false;
		}
	}
</script>

<FlowStep
	number={firstNumber}
	title={m.schoolOrInstitution()}
	summary={schoolChosen ? $formData.schoolName || m.noSchoolGiven() : undefined}
	onEdit={() => (schoolChosen = false)}
	last={!schoolChosen}
	scrollIntoView
>
	<SchoolPicker
		{form}
		name="schoolName"
		idName="schoolId"
		label={m.schoolOrInstitution()}
		description={m.supervisorSchoolDescription()}
	/>
	<button class="btn btn-primary mt-4 self-end" type="button" onclick={confirmSchool}>
		{m.next()}
		<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
	</button>
</FlowStep>

{#if schoolChosen}
	<FlowStep number={firstNumber + 1} title={m.attendance()} last scrollIntoView>
		<div class="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label={m.attendance()}>
			{#each attendanceChoices as choice (choice.attends)}
				{@const selected = attends === choice.attends}
				<button
					type="button"
					role="radio"
					aria-checked={selected}
					class="rounded-box flex items-start gap-3 border-2 p-4 text-left transition-colors duration-200 {selected
						? 'border-primary bg-primary/10'
						: 'bg-base-200 hover:bg-base-300 border-transparent'}"
					onclick={() => (attends = choice.attends)}
				>
					<span
						class="rounded-box flex size-10 shrink-0 items-center justify-center text-lg transition-colors duration-200 {selected
							? 'bg-primary text-primary-content'
							: 'bg-primary/10 text-primary'}"
					>
						<i class="fa-sharp-duotone fa-solid fa-{choice.icon}"></i>
					</span>
					<span class="flex flex-col gap-1">
						<span class="font-semibold">{choice.title}</span>
						<span class="text-base-content/70 text-sm">{choice.text}</span>
					</span>
				</button>
			{/each}
		</div>
		<button
			class="btn btn-primary mt-4 self-end"
			type="button"
			disabled={attends === undefined || submitting}
			onclick={signup}
		>
			{#if submitting}
				<span class="loading loading-spinner loading-sm"></span>
			{/if}
			{m.supervisorSignupButton()}
			<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
		</button>
	</FlowStep>
{/if}
