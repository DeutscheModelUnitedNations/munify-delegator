<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import { client } from '$lib/api/rumbleClient/client';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormFile from '$lib/components/form/FormFile.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF
	} from '$lib/utils/pdfGenerator';
	import { templateOrDefault, testPrintParticipant, testPrintRecipient } from './testPrintData';
	import type { ConferenceSettings } from '../form-schema';

	interface Props {
		conferenceId: string;
		form: SuperForm<ConferenceSettings>;
		/** Which templates the server already holds; a test print needs them stored. */
		storedDocuments: {
			contractContentSet: boolean;
			guardianConsentContentSet: boolean;
			mediaConsentContentSet: boolean;
			termsAndConditionsContentSet: boolean;
			certificateContentSet: boolean;
		};
	}

	let { conferenceId, form, storedDocuments }: Props = $props();
	let formData = $derived(form.form);

	let loading = $state(false);

	async function handleGeneratePostalPDF() {
		loading = true;

		try {
			// Fetched on demand: the templates are large and only the test print needs them.
			const templates = await client.query.conference({
				__args: { id: conferenceId },
				contractContent: true,
				guardianConsentContent: true,
				mediaConsentContent: true,
				termsAndConditionsContent: true
			});

			await downloadCompletePostalRegistrationPDF(
				false,
				testPrintParticipant(),
				testPrintRecipient($formData),
				templateOrDefault(templates.contractContent),
				templateOrDefault(templates.guardianConsentContent),
				templateOrDefault(templates.mediaConsentContent),
				templateOrDefault(templates.termsAndConditionsContent),
				'test_postal_registration.pdf'
			);
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			loading = false;
		}
	}

	async function handleGenerateCertificatePDF() {
		const randomString = (n: number) => {
			const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
			let result = '';
			for (let i = 0; i < n; i++) {
				result += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return result;
		};

		loading = true;

		try {
			const templates = await client.query.conference({
				__args: { id: conferenceId },
				certificateContent: true
			});

			await downloadCompleteCertificate(
				{
					fullName: 'Antonio Guterres',
					jwt: randomString(20) + '.' + randomString(200) + '.' + randomString(350)
				},
				templateOrDefault(templates.certificateContent),
				`test_certificate.pdf`
			);
		} finally {
			loading = false;
		}
	}
</script>

<div class="alert alert-info mb-6">
	<i class="fas fa-circle-info"></i>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<span>{@html m.tabExplanationDocuments()}</span>
</div>

<FormFieldset title={m.postalRegistration()}>
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
</FormFieldset>

<FormFieldset title={m.postalTemplates()}>
	<FormFile
		{form}
		name="contractBasePDF"
		label={m.postalTemplateContract()}
		accept="*.pdf"
		inputClass={storedDocuments.contractContentSet ? 'file-input-success' : undefined}
	/>
	<FormFile
		{form}
		name="guardianConsentBasePDF"
		label={m.postalTemplateGuardianConsent()}
		accept="*.pdf"
		inputClass={storedDocuments.guardianConsentContentSet ? 'file-input-success' : undefined}
	/>
	<FormFile
		{form}
		name="mediaConsentBasePDF"
		label={m.postalTemplateMediaConsent()}
		accept="*.pdf"
		inputClass={storedDocuments.mediaConsentContentSet ? 'file-input-success' : undefined}
	/>
	<FormFile
		{form}
		name="termsAndConditionsBasePDF"
		label={m.postalTemplateTermsAndConditions()}
		accept="*.pdf"
		inputClass={storedDocuments.termsAndConditionsContentSet ? 'file-input-success' : undefined}
	/>
	<button
		class="btn dark:btn-outline {loading ||
		!storedDocuments.contractContentSet ||
		!storedDocuments.guardianConsentContentSet ||
		!storedDocuments.mediaConsentContentSet ||
		!storedDocuments.termsAndConditionsContentSet
			? 'btn-disabled'
			: ''}"
		onclick={async (e) => {
			e.preventDefault();
			handleGeneratePostalPDF();
		}}
	>
		<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
	</button>
</FormFieldset>

<FormFieldset title={m.certificate()}>
	<FormFile
		{form}
		name="certificateBasePDF"
		label={m.certificateTemplate()}
		accept="*.pdf"
		inputClass={storedDocuments.certificateContentSet ? 'file-input-success' : undefined}
	/>
	<button
		class="btn dark:btn-outline {loading || !storedDocuments.certificateContentSet
			? 'btn-disabled'
			: ''}"
		onclick={async (e) => {
			e.preventDefault();
			handleGenerateCertificatePDF();
		}}
	>
		<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
	</button>
</FormFieldset>
