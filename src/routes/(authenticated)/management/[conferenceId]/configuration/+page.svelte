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
	import FormFile from '$lib/components/Form/FormFile.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import formatNames from '$lib/services/formatNames';

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

	let loading = $state(false);

	async function handleGeneratePostalPDF() {
		loading = true;
		try {
			const recipientData: RecipientData = {
				name: "L'Office des Nations Unies a Geneve",
				address: 'Av. de la Paix 8-14',
				zip: '1211',
				city: 'Geneve',
				country: 'Schweiz'
			};

			const participantData: ParticipantData = {
				id: '123456781234567812345678',
				name: formatNames('Antonio', 'Guterres', {
					givenNameFirst: true,
					familyNameUppercase: true,
					givenNameUppercase: true
				}),
				address: '405 E 45th St, New York, NY 10017, USA',
				birthday: new Date('1949-04-30').toLocaleDateString() ?? ''
			};

			await downloadCompletePostalRegistrationPDF(
				false,
				participantData,
				recipientData,
				data.contractContent ?? undefined,
				data.guardianConsentContent ?? undefined,
				data.mediaConsentContent ?? undefined,
				data.termsAndConditionsContent ?? undefined,
				'test_postal_registration.pdf'
			);
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			loading = false;
		}
	}

	async function handleGenerateCertificatePDF() {
		const conference = $formData;

		const randomString = (n: number) => {
			const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
			let result = '';
			for (let i = 0; i < n; i++) {
				result += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return result;
		};

		loading = true;
		await downloadCompleteCertificate(
			{
				fullName: 'Antonio Guterres',
				jwt: randomString(20) + '.' + randomString(200) + '.' + randomString(350)
			},
			data.certificateContent ?? undefined,
			`test_certificate.pdf`
		);
		loading = false;
	}
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
		<FormTextInput
			{form}
			name="linkToPaperInbox"
			placeholder={'https://path-to-your-paper-inbox.com'}
			label={m.paperInbox()}
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
		<FormFile {form} name="contractBasePDF" label={m.postalTemplateContract()} accept="*.pdf" />
		<FormFile
			{form}
			name="guardianConsentBasePDF"
			label={m.postalTemplateGuardianConsent()}
			accept="*.pdf"
		/>
		<FormFile
			{form}
			name="mediaConsentBasePDF"
			label={m.postalTemplateMediaConsent()}
			accept="*.pdf"
		/>
		<FormFile
			{form}
			name="termsAndConditionsBasePDF"
			label={m.postalTemplateTermsAndConditions()}
			accept="*.pdf"
		/>
		<button
			class="btn"
			onclick={async (e) => {
				e.preventDefault();
				handleGeneratePostalPDF();
			}}
		>
			<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
		</button>
		<h3 class="mt-8 text-lg font-bold">{m.certificate()}</h3>
		<FormFile {form} name="certificateBasePDF" label={m.CertifiacteTemplate()} accept="*.pdf" />
		<button
			class="btn"
			onclick={async (e) => {
				e.preventDefault();
				handleGenerateCertificatePDF();
			}}
		>
			<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
		</button>
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
