<script lang="ts">
	import Form from '$lib/components/form/Form.svelte';
	import { m } from '$lib/paraglide/messages';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { waitingListFormSchema } from './form-schema';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = params.conferenceId;
	const user = await getCurrentUser();

	// Seeded once, on purpose: this is the initial value of a form, and re-reading it while someone
	// is typing would throw their answers away.
	const [existingEntry] = await client.query.waitingListEntries({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
		id: true,
		school: true,
		motivation: true,
		experience: true,
		requests: true
	});

	let alreadyOnWaitingList = $state(!!existingEntry);

	const form = superForm(
		defaults(
			{
				school: existingEntry?.school ?? '',
				motivation: existingEntry?.motivation ?? '',
				experience: existingEntry?.experience ?? '',
				requests: existingEntry?.requests ?? ''
			},
			zod4Client(waitingListFormSchema)
		),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(waitingListFormSchema),
			onError(e) {
				toast.error(e.result.error.message);
			},
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.createWaitingListEntry({
					__args: { ...validated.data, conferenceId },
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				alreadyOnWaitingList = true;
			}
		}
	);

	let disabled = $derived(alreadyOnWaitingList);
</script>

<div class="flex w-full flex-col items-center p-4">
	<hero class="mt-20 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{m.vacanciesSlashWaitingList()}</h1>
		<p class="max-ch-md">
			{@html m.vacanciesSlashWaitingListDescription()}
		</p>
	</hero>

	{#if alreadyOnWaitingList}
		<div class="alert alert-success alert-vertical sm:alert-horizontal mt-10">
			<i class="fas fa-circle-check"></i>
			{@html m.alreadyOnWaitingList()}
		</div>
	{/if}

	<main class="mt-10">
		<Form {form}>
			<FormFieldset title={m.questionnaire()}>
				<FormTextInput
					{form}
					name="school"
					placeholder={m.answerHere()}
					label={m.whichSchoolDoYouComeFrom()}
					{disabled}
				/>
				<FormTextArea
					{form}
					name="motivation"
					placeholder={m.answerHere()}
					label={m.whyDoYouWantToJoinTheConferenceSingleParticipant()}
					{disabled}
				/>
				<FormTextArea
					{form}
					name="experience"
					placeholder={m.answerHere()}
					label={m.howMuchExperienceDoesYourDelegationHaveSingleParticipant()}
					{disabled}
				/>
				<FormTextArea
					{form}
					name="requests"
					label={m.anySpecificRequests()}
					description={m.anySpecificRequestsDescription()}
					placeholder={m.answerHereOrLeaveEmpty()}
					{disabled}
				/>
			</FormFieldset>
		</Form>
	</main>
</div>
