<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Form from '$lib/components/form/Form.svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { toast } from 'svelte-sonner';
	import { applicationFormSchema } from '$lib/schemata/applicationForm';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	const conferenceId = page.params.conferenceId!;
	const roleId = page.params.roleId!;
	const user = await getCurrentUser();

	const role = $derived(
		await client.liveQuery.customConferenceRole({ __args: { id: roleId }, name: true })
	);

	// An existing application prefills the form, so the participant can amend it. Read once: this is
	// the form's initial value, and re-reading it mid-edit would discard what was typed.
	const [existing] = await client.query.singleParticipants({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
		experience: true,
		motivation: true,
		school: true
	});

	const form = superForm(
		defaults(
			{
				school: existing?.school ?? '',
				motivation: existing?.motivation ?? '',
				experience: existing?.experience ?? ''
			},
			zod4Client(applicationFormSchema)
		),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(applicationFormSchema),
			onError(e) {
				toast.error(e.result.error.message);
			},
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.createSingleParticipant({
					__args: { ...validated.data, conferenceId, roleId },
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				await goto('/dashboard');
			}
		}
	);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<Form {form} class="w-full max-w-lg" requireTaintedToSubmit={false}>
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
