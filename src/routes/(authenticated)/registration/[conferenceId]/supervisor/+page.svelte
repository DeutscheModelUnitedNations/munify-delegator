<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice.js';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);

	let plansOwnAttendenceAtConference = $state(true);

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
	let submitting = $state(false);

	async function signup(event: SubmitEvent) {
		event.preventDefault();
		const school = schoolChoiceSchema.safeParse($formData);
		if (!school.success) {
			toast.error(m.schoolNameTooLong());
			return;
		}
		submitting = true;
		try {
			const promise = client.mutate.createConferenceSupervisor({
				__args: { conferenceId, plansOwnAttendenceAtConference, ...school.data },
				id: true
			});
			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: m.genericToastSuccess(),
				error: m.genericToastError()
			});
			await promise;
			await goto(resolve(`dashboard/${conferenceId}`));
		} finally {
			submitting = false;
		}
	}

	// Submitting before hydration attaches the handler would post natively; there is no action.
	let mounted = $state(false);
	onMount(() => (mounted = true));
</script>

<RegistrationStepPage
	{conferenceId}
	title={m.signupForSupervisors()}
	description={m.signupForSupervisorsDescription()}
>
	<form class="card bg-base-100 border-base-200 w-full max-w-md border shadow-lg" onsubmit={signup}>
		<div class="card-body items-center justify-center">
			<SchoolPicker
				{form}
				name="schoolName"
				idName="schoolId"
				label={m.schoolOrInstitution()}
				description={m.supervisorSchoolDescription()}
			/>
			<label class="label mt-4 cursor-pointer">
				<span class="mr-4">{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={plansOwnAttendenceAtConference}
					onchange={() => (plansOwnAttendenceAtConference = !plansOwnAttendenceAtConference)}
				/>
			</label>
			<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
			<p class="text-center text-sm italic">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
				{@html plansOwnAttendenceAtConference
					? m.willBePresentAtConference()
					: m.willNotBePresentAtConference()}
			</p>
			<button class="btn btn-primary mt-10 w-full" type="submit" disabled={!mounted || submitting}>
				{m.supervisorSignupButton()}
				<i class="fas fa-paper-plane"></i>
			</button>
		</div>
	</form>
</RegistrationStepPage>
