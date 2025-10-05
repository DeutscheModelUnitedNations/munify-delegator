<script lang="ts">
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormFileInput from '$lib/components/Form/FormFile.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import Form from '$lib/components/Form/Form.svelte';
	import { conferenceSettingsFormSchema } from './form-schema';
	import toast from 'svelte-french-toast';
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
	import { graphql } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zodClient(conferenceSettingsFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
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

		const getPostalBasePDFData = graphql(`
			query GetPostalBasePDFDataForExample($conferenceId: String!) {
				findUniqueConference(where: { id: $conferenceId }) {
					contractContent
					guardianConsentContent
					mediaConsentContent
					termsAndConditionsContent
				}
			}
		`);

		const pdfData = await getPostalBasePDFData.fetch({
			variables: {
				conferenceId: data.conferenceId
			}
		});

		if (pdfData.errors) {
			toast.error('Could not get Template from Server');
			loading = false;
			return;
		}

		try {
			const recipientData: RecipientData = {
				name: $formData.postalName ?? 'Not set',
				address: $formData.postalStreet ?? 'Not set',
				zip: $formData.postalZip ?? 'Not set',
				city: $formData.postalCity ?? 'Not set',
				country: $formData.postalCountry ?? 'Not set'
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
				pdfData.data?.findUniqueConference?.contractContent ?? undefined,
				pdfData.data?.findUniqueConference?.guardianConsentContent ?? undefined,
				pdfData.data?.findUniqueConference?.mediaConsentContent ?? undefined,
				pdfData.data?.findUniqueConference?.termsAndConditionsContent ?? undefined,
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

		const getCertificateBasePDFData = graphql(`
			query GetCertificateBasePDFDataForExample($conferenceId: String!) {
				findUniqueConference(where: { id: $conferenceId }) {
					certificateContent
				}
			}
		`);

		const pdfData = await getCertificateBasePDFData.fetch({
			variables: {
				conferenceId: data.conferenceId
			}
		});

		if (pdfData.errors) {
			toast.error('Could not get Template from Server');
			loading = false;
			return;
		}

		await downloadCompleteCertificate(
			{
				fullName: 'Antonio Guterres',
				jwt: randomString(20) + '.' + randomString(200) + '.' + randomString(350)
			},
			pdfData.data?.findUniqueConference?.certificateContent ?? undefined,
			`test_certificate.pdf`
		);
		loading = false;
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-2xl">
	<h1 class="text-2xl font-bold">{m.settings()}</h1>
	<Form {form}>
		<FormFieldset title={m.general()}>
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
				placeholder="New York, USA"
				label={m.conferenceLocation()}
			/>
			<FormTextInput {form} name="language" placeholder="Deutsch" label={m.conferenceLanguage()} />
			<FormTextInput {form} name="website" placeholder="mun-sh.de" label={m.conferenceWebsite()} />
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
		</FormFieldset>

		<FormFieldset title={m.conferenceStatus()}>
			<FormSelect
				{form}
				name="state"
				label={m.conferenceStatus()}
				options={conferenceStateOptions}
			/>
			<div class="prose">
				{@html m.conferenceStatusDescription()}
			</div>
		</FormFieldset>

		<FormFieldset title={m.communication()}>
			<div class="flex w-full items-center gap-2">
				<FormTextArea {form} name="info" placeholder="Info..." label={m.infos()} />
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
				placeholder="https://path-to-your-guide.com"
				label={m.preparationGuide()}
			/>
			<FormTextInput
				{form}
				name="linkToPaperInbox"
				placeholder="https://path-to-your-paper-inbox.com"
				label={m.paperInbox()}
			/>
			<a class="btn btn-primary self-start" href="./configuration/committees">
				{m.committeesAndAgendaItems()}
				<i class="fas fa-podium ml-2"></i>
			</a>
		</FormFieldset>

		<FormFieldset title={m.bankingInformation()}>
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
			<FormTextInput {form} name="feeAmount" placeholder="75,00" label={m.fee()} type="number" />
			<FormTextInput {form} name="bankName" placeholder="Bank Name" label={m.bankName()} />
			<FormTextInput {form} name="iban" placeholder="DE12345678901234567890" label={m.iban()} />
			<FormTextInput {form} name="bic" placeholder="ABCDEFGH" label={m.bic()} />
			<FormTextInput
				{form}
				name="accountHolder"
				placeholder="Max Mustermann"
				label={m.accountHolder()}
			/>
			<FormTextInput {form} name="currency" placeholder="EUR" label={m.currency()} />
		</FormFieldset>

		<FormFieldset title={m.postalRegistration()}>
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
			<FormFile
				{form}
				name="contractBasePDF"
				label={m.postalTemplateContract()}
				accept="*.pdf"
				inputClass={data.contractContentSet ? 'file-input-success' : undefined}
			/>
			<FormFile
				{form}
				name="guardianConsentBasePDF"
				label={m.postalTemplateGuardianConsent()}
				accept="*.pdf"
				inputClass={data.guardianConsentContentSet ? 'file-input-success' : undefined}
			/>
			<FormFile
				{form}
				name="mediaConsentBasePDF"
				label={m.postalTemplateMediaConsent()}
				accept="*.pdf"
				inputClass={data.mediaConsentContentSet ? 'file-input-success' : undefined}
			/>
			<FormFile
				{form}
				name="termsAndConditionsBasePDF"
				label={m.postalTemplateTermsAndConditions()}
				accept="*.pdf"
				inputClass={data.termsAndConditionsContentSet ? 'file-input-success' : undefined}
			/>
			<button
				class="btn dark:btn-outline {loading ||
				!data.contractContentSet ||
				!data.guardianConsentContentSet ||
				!data.mediaConsentContentSet ||
				!data.termsAndConditionsContentSet
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
				inputClass={data.certificateContentSet ? 'file-input-success' : undefined}
			/>
			<button
				class="btn dark:btn-outline {loading || !data.certificateContentSet ? 'btn-disabled' : ''}"
				onclick={async (e) => {
					e.preventDefault();
					handleGenerateCertificatePDF();
				}}
			>
				<i class="fas {!loading ? 'fa-vial' : 'fa-spinner fa-spin'}"></i>{m.postalTemplateTest()}
			</button>
		</FormFieldset>
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
