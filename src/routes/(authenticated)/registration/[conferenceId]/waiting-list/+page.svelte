<script lang="ts">
	import Form from '$lib/components/Form/Form.svelte';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import toast from 'svelte-french-toast';
	import { waitingListFormSchema } from './form-schema';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import { cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zodClient(waitingListFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onSubmit(_e) {
			cache.markStale();
			invalidateAll();
		}
	});

	let { tainted, form: formContent } = form;

	let disabled = $derived(data.disabled);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<hero class="mt-20 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{m.vacanciesSlashWaitingList()}</h1>
		<p class="max-ch-md">
			{@html m.vacanciesSlashWaitingListDescription()}
		</p>
	</hero>

	{#if !$tainted && !!$formContent.school}
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
					placeholder={m.answereHereOrLeaveEmpty()}
					{disabled}
				/>
			</FormFieldset>
		</Form>
	</main>
</div>
