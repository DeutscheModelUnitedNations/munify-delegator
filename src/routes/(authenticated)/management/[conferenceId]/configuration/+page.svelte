<script lang="ts">
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormFileInput from '$lib/components/Form/FormFile.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import Form from '$lib/components/Form/Form.svelte';
	import { conferenceSettingsFormSchema } from './form-schema';
	import { toast } from '@zerodevx/svelte-toast';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import Markdown from '$lib/components/Markdown/Markdown.svelte';
	import FormCheckbox from '$lib/components/Form/FormCheckbox.svelte';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod(conferenceSettingsFormSchema),
		onError(e) {
			toast.push(e.result.error.message);
		}
	});
	let formData = $derived(form.form);

	let infoPreviewModalOpen = $state(false);

	const conferenceStateOptions = [
		{
			label: m.conferenceStatusPre(),
			value: 'PRE'
		},
		{
			label: m.conferenceStatusParticipantRegistration(),
			value: 'PARTICIPANT_REGISTRATION'
		},
		{
			label: m.conferenceStatusPreparation(),
			value: 'PREPARATION'
		},
		{
			label: m.conferenceStatusActive(),
			value: 'ACTIVE'
		},
		{
			label: m.conferenceStatusPost(),
			value: 'POST'
		}
	];
</script>

<div class="card-body rounded-2xl bg-base-100 dark:bg-base-200">
	<Form {form}>
		<h3 class="mt-8 text-lg font-bold">{m.general()}</h3>
		<FormTextInput
			{form}
			name="title"
			placeholder={`MUN-SH ${new Date().getFullYear() + 1}`}
			label={m.conferenceTitle()}
		/>
		<FormTextInput
			{form}
			name="longTitle"
			placeholder={`Model United Nation Schleswig-Holstein ${new Date().getFullYear() + 1}`}
			label={m.conferenceLongTitle()}
		/>
		<FormTextInput
			{form}
			name="location"
			placeholder={'New York, USA'}
			label={m.conferenceLocation()}
		/>
		<FormTextInput {form} name="language" placeholder={'Deutsch'} label={m.conferenceLanguage()} />
		<FormTextInput {form} name="website" placeholder={'mun-sh.de'} label={m.conferenceWebsite()} />
		{#if $formData.image || data.imageDataURL}
			<img
				src={$formData.image ? URL.createObjectURL($formData.image) : data.imageDataURL}
				class="h-64 w-64"
				alt="Preview of the file you selected"
			/>
		{/if}
		<FormFileInput {form} name="image" label={m.conferenceImage()} accept="image/*" />
		<FormDateTimeInput {form} name="startAssignment" label={m.conferenceStartAssignment()} />
		<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
		<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />

		<h3 class="mt-8 text-lg font-bold">{m.conferenceStatus()}</h3>
		<FormSelect {form} name="state" label={m.conferenceStatus()} options={conferenceStateOptions} />
		<div class="prose">
			{@html m.conferenceStatusDescription()}
		</div>

		<h3 class="mt-8 text-lg font-bold">{m.communication()}</h3>
		<div class="flex w-full items-center gap-2">
			<FormTextArea {form} name="info" placeholder={'Info...'} label={m.infos()} />
			<button
				class="btn btn-primary h-full"
				onclick={(e) => {
					e.preventDefault();
					infoPreviewModalOpen = !infoPreviewModalOpen;
				}}
			>
				{m.preview()}
			</button>
		</div>
		<FormTextInput
			{form}
			name="linkToPreparationGuide"
			placeholder={'https://path-to-your-guide.com'}
			label={m.preparationGuide()}
		/>

		<h3 class="mt-8 text-lg font-bold">{m.bankingInformation()}</h3>
		<FormCheckbox
			{form}
			name="unlockPayments"
			label={m.paymentOpen()}
			disabled={!$formData.feeAmount ||
				!$formData.bankName ||
				!$formData.iban ||
				!$formData.bic ||
				!$formData.accountHolder ||
				!$formData.currency}
		/>
		<FormTextInput {form} name="feeAmount" placeholder={'75,00'} label={m.fee()} type="number" />
		<FormTextInput {form} name="bankName" placeholder={'Bank Name'} label={m.bankName()} />
		<FormTextInput {form} name="iban" placeholder={'DE12345678901234567890'} label={m.iban()} />
		<FormTextInput {form} name="bic" placeholder={'ABCDEFGH'} label={m.bic()} />
		<FormTextInput
			{form}
			name="accountHolder"
			placeholder={'Max Mustermann'}
			label={m.accountHolder()}
		/>
		<FormTextInput {form} name="currency" placeholder={'EUR'} label={m.currency()} />

		<h3 class="mt-8 text-lg font-bold">{m.postalRegistration()}</h3>
		<FormCheckbox
			{form}
			name="unlockPostals"
			label={m.postalOpen()}
			disabled={!$formData.postalName ||
				!$formData.postalStreet ||
				!$formData.postalZip ||
				!$formData.postalCity ||
				!$formData.postalCountry}
		/>
		<FormTextInput {form} name="postalName" placeholder={m.name()} label={m.name()} />
		<FormTextInput {form} name="postalStreet" placeholder={m.street()} label={m.street()} />
		<FormTextInput
			{form}
			name="postalApartment"
			placeholder={m.streetAddition()}
			label={m.streetAddition()}
		/>
		<FormTextInput {form} name="postalZip" placeholder={m.zipCode()} label={m.zipCode()} />
		<FormTextInput {form} name="postalCity" placeholder={m.city()} label={m.city()} />
		<FormTextInput {form} name="postalCountry" placeholder={m.country()} label={m.country()} />
	</Form>
</div>

{#if infoPreviewModalOpen}
	<dialog class="modal modal-open">
		<div class="prose modal-box bg-base-200">
			<Markdown source={$formData.info ?? ''} />
		</div>
		<button
			class="modal-backdrop"
			onclick={() => (infoPreviewModalOpen = false)}
			aria-label="Close modal"
		>
		</button>
	</dialog>
{/if}
