<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import FlowStep from './FlowStep.svelte';
	import ApplicationBlockers from '#lib/components/registration/ApplicationBlockers.svelte';

	/** Signing up as a supervisor: the school first, then whether they attend themselves. */
	interface Props {
		conferenceId: string;
		/** The number of the first of the two steps, after those before them. */
		firstNumber: number;
	}

	let { conferenceId, firstNumber }: Props = $props();

	// What would keep the caller from signing up as attending in person; not attending stays open.
	const blockers = $derived(
		await client.query.mySupervisorSignupBlockers({
			__args: { conferenceId },
			userId: true,
			ageIssue: true,
			invalidFields: true,
			user: { givenName: true, familyName: true }
		})
	);

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
	const attendingBlocked = $derived(attends === true && blockers.length > 0);
	const cannotSubmit = $derived(attends === undefined || attendingBlocked || submitting);

	const attendanceChoices = $derived([
		{
			attends: true,
			icon: 'suitcase-rolling',
			title: m.supervisorAttendsTitle(),
			text: m.supervisorAttendsText()
		},
		{
			attends: false,
			icon: 'laptop',
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
		<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
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
						<i aria-hidden="true" class="ph-duotone ph-{choice.icon}"></i>
					</span>
					<span class="flex flex-col gap-1">
						<span class="font-semibold">{choice.title}</span>
						<span class="text-base-content/70 text-sm">{choice.text}</span>
					</span>
				</button>
			{/each}
		</div>
		{#if attendingBlocked}
			<ApplicationBlockers
				{blockers}
				title={m.supervisorAttendanceBlockersTitle()}
				description={m.supervisorSignupBlockersDescription()}
				class="mt-4"
			/>
		{/if}
		<button
			class="btn btn-primary mt-4 self-end"
			type="button"
			disabled={cannotSubmit}
			onclick={signup}
		>
			{#if submitting}
				<span class="loading loading-spinner loading-sm"></span>
			{/if}
			{m.supervisorSignupButton()}
			<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
		</button>
	</FlowStep>
{/if}
