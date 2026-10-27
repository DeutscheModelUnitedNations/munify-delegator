<script lang="ts">
	import Form from '#lib/components/form/Form.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { waitingListFormSchema } from './form-schema';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';
	import FormTextArea from '#lib/components/form/FormTextArea.svelte';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import RegistrationStepPage from '../RegistrationStepPage.svelte';

	let { params }: PageProps = $props();

	// Read once: it seeds the form below, and this page is only ever entered from another route,
	// which mounts it afresh, so the conference cannot change while it is open.
	const conferenceId = untrack(() => params.conferenceId);
	const user = await getCurrentUser();

	// Seeded once, on purpose: this is the initial value of a form, and re-reading it while someone
	// is typing would throw their answers away.
	const [existingEntry] = await client.query.waitingListEntries({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
		id: true,
		school: { id: true, name: true },
		motivation: true,
		experience: true,
		requests: true
	});

	let alreadyOnWaitingList = $state(!!existingEntry);

	const form = superForm(
		defaults(
			{
				schoolId: existingEntry?.school?.id ?? null,
				schoolName: existingEntry?.school?.name ?? '',
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

<RegistrationStepPage {conferenceId} icon="hourglass-half" title={m.vacanciesSlashWaitingList()}>
	<div class="prose prose-sm mb-4 max-w-none">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
		{@html m.vacanciesSlashWaitingListDescription()}
	</div>

	{#if alreadyOnWaitingList}
		<div role="status" class="alert bg-success/10 border-success/30 mb-4">
			<i class="fa-sharp-duotone fa-solid fa-circle-check text-success text-xl"></i>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
			<span>{@html m.alreadyOnWaitingList()}</span>
		</div>
	{/if}

	<Form {form}>
		<FormFieldset title={m.questionnaire()}>
			<SchoolPicker
				{form}
				name="schoolName"
				idName="schoolId"
				label={m.whichSchoolDoYouComeFrom()}
				description={m.schoolPickerDescription()}
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
</RegistrationStepPage>
