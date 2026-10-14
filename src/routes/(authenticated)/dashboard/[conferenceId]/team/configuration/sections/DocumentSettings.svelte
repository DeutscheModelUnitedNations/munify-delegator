<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import { client } from '$lib/api/rumbleClient/client';
	import FormSection from '$lib/components/form/FormSection.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import PdfTemplateHelp from '$lib/components/form/PdfTemplateHelp.svelte';
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
			contractFile: { id: string } | null;
			guardianConsentFile: { id: string } | null;
			mediaConsentFile: { id: string } | null;
			termsAndConditionsFile: { id: string } | null;
			certificateFile: { id: string } | null;
		};
	}

	let { conferenceId, form, storedDocuments }: Props = $props();
	let formData = $derived(form.form);

	let loading = $state(false);

	async function handleGeneratePostalPDF() {
		loading = true;

		try {
			// Fetched on demand: only the test print needs the templates.
			const templates = await client.query.conference({
				__args: { id: conferenceId },
				contractFile: { url: true },
				guardianConsentFile: { url: true },
				mediaConsentFile: { url: true },
				termsAndConditionsFile: { url: true }
			});

			await downloadCompletePostalRegistrationPDF(
				false,
				testPrintParticipant(),
				testPrintRecipient($formData),
				templates,
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
				certificateFile: { url: true }
			});

			await downloadCompleteCertificate(
				{
					fullName: 'Antonio Guterres',
					jwt: randomString(20) + '.' + randomString(200) + '.' + randomString(350)
				},
				templateOrDefault(templates.certificateFile?.url),
				`test_certificate.pdf`
			);
		} finally {
			loading = false;
		}
	}
</script>

<FormSection title={m.postalRegistration()} icon="envelope">
	<FormTextInput {form} name="postalName" placeholder={m.name()} label={m.name()} />
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[2fr_1fr]">
		<FormTextInput {form} name="postalStreet" placeholder={m.street()} label={m.street()} />
		<FormTextInput
			{form}
			name="postalApartment"
			placeholder={m.streetAddition()}
			label={m.streetAddition()}
		/>
	</div>
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_2fr]">
		<FormTextInput {form} name="postalZip" placeholder={m.zipCode()} label={m.zipCode()} />
		<FormTextInput {form} name="postalCity" placeholder={m.city()} label={m.city()} />
	</div>
	<FormTextInput {form} name="postalCountry" placeholder={m.country()} label={m.country()} />
</FormSection>

<FormSection title={m.postalTemplates()} icon="file-pdf">
	{#snippet titleAction()}
		<PdfTemplateHelp />
	{/snippet}
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
		<FormFile
			{form}
			name="contractBasePDF"
			label={m.postalTemplateContract()}
			accept="*.pdf"
			inputClass={storedDocuments.contractFile ? 'file-input-success' : undefined}
		/>
		<FormFile
			{form}
			name="guardianConsentBasePDF"
			label={m.postalTemplateGuardianConsent()}
			accept="*.pdf"
			inputClass={storedDocuments.guardianConsentFile ? 'file-input-success' : undefined}
		/>
		<FormFile
			{form}
			name="mediaConsentBasePDF"
			label={m.postalTemplateMediaConsent()}
			accept="*.pdf"
			inputClass={storedDocuments.mediaConsentFile ? 'file-input-success' : undefined}
		/>
		<FormFile
			{form}
			name="termsAndConditionsBasePDF"
			label={m.postalTemplateTermsAndConditions()}
			accept="*.pdf"
			inputClass={storedDocuments.termsAndConditionsFile ? 'file-input-success' : undefined}
		/>
	</div>
	<div>
		<button
			class="btn btn-sm dark:btn-outline {loading ||
			!storedDocuments.contractFile ||
			!storedDocuments.guardianConsentFile ||
			!storedDocuments.mediaConsentFile ||
			!storedDocuments.termsAndConditionsFile
				? 'btn-disabled'
				: ''}"
			onclick={async (e) => {
				e.preventDefault();
				handleGeneratePostalPDF();
			}}
		>
			<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
		</button>
	</div>
</FormSection>

<FormSection title={m.certificate()} icon="award">
	{#snippet titleAction()}
		<PdfTemplateHelp />
	{/snippet}
	<FormFile
		{form}
		name="certificateBasePDF"
		label={m.certificateTemplate()}
		accept="*.pdf"
		inputClass={storedDocuments.certificateFile ? 'file-input-success' : undefined}
	/>
	<div>
		<button
			class="btn btn-sm dark:btn-outline {loading || !storedDocuments.certificateFile
				? 'btn-disabled'
				: ''}"
			onclick={async (e) => {
				e.preventDefault();
				handleGenerateCertificatePDF();
			}}
		>
			<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
		</button>
	</div>
</FormSection>
