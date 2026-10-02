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
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Read once: they seed the form below, and this page is only ever entered from another route
	// (the role list), which mounts it afresh, so they cannot change while it is open.
	const { conferenceId, roleId } = untrack(() => ({
		conferenceId: params.conferenceId,
		roleId: params.roleId
	}));
	const user = await getCurrentUser();

	// Both keyed by the ids read once above, so a plain await is enough; the role's name stays live
	// through its query. An existing application prefills the form, so the participant can amend
	// it. Read once: this is the form's initial value, and re-reading it mid-edit would discard
	// what was typed.
	const [role, [existing]] = await Promise.all([
		client.liveQuery.customConferenceRole({ __args: { id: roleId }, name: true }),
		client.query.singleParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
			experience: true,
			motivation: true,
			school: true
		})
	]);

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
				await goto(resolve('/dashboard'));
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
	<a
		class="btn btn-warning mt-8"
		type="button"
		href={resolve(`/registration/${conferenceId}/individual`)}>{m.back()}</a
	>
</div>
