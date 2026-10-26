<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { SuperForm } from 'sveltekit-superforms';
	import { client } from '#lib/api/rumbleClient/client.js';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import PdfTemplateHelp from '#lib/components/form/PdfTemplateHelp.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF
	} from '#lib/utils/pdfGenerator.js';
	import {
		templateOrDefault,
		testPrintCertificate,
		testPrintParticipant,
		testPrintRecipient
	} from './testPrintData';
	import { resolveDocumentLayout, type LayoutDocument } from '#lib/helpers/documentLayout.js';
	import DocumentLayoutEditor from './DocumentLayoutEditor.svelte';
	import TemplateCard from './TemplateCard.svelte';
	import type { ConferenceSettings } from '../form-schema';

	interface Props {
		conferenceId: string;
		form: SuperForm<ConferenceSettings>;
		/** Which templates the server already holds; a test print needs them stored. */
		storedDocuments: {
			contractFile: { url: string } | null;
			guardianConsentFile: { url: string } | null;
			mediaConsentFile: { url: string } | null;
			termsAndConditionsFile: { url: string } | null;
			certificateFile: { url: string } | null;
		};
	}

	let { conferenceId, form, storedDocuments }: Props = $props();
	let formData = $derived(form.form);

	let loading = $state(false);

	/** A layout being edited, printed instead of the stored one for its document. */
	type Draft = { document: LayoutDocument; layout: unknown };

	/** The stored layouts with the draft in its document's place. */
	function withDraft(stored: unknown, draft: Draft | undefined): unknown {
		if (!draft) return stored;
		const others = typeof stored === 'object' && stored !== null ? stored : {};
		return { ...others, [draft.document]: draft.layout };
	}

	async function printPostal(draft?: Draft) {
		// Fetched on demand: only the test print needs the templates.
		const templates = await client.query.conference({
			__args: { id: conferenceId },
			contractFile: { url: true },
			guardianConsentFile: { url: true },
			mediaConsentFile: { url: true },
			termsAndConditionsFile: { url: true },
			documentLayouts: true
		});
		// a minor's, so the guardian consent is part of it
		await downloadCompletePostalRegistrationPDF(
			false,
			testPrintParticipant(),
			testPrintRecipient($formData),
			{
				contractFile: templates.contractFile,
				guardianConsentFile: templates.guardianConsentFile,
				mediaConsentFile: templates.mediaConsentFile,
				termsAndConditionsFile: templates.termsAndConditionsFile,
				documentLayouts: withDraft(templates.documentLayouts, draft)
			},
			'test_postal_registration.pdf'
		);
	}

	async function printCertificate(draft?: Draft) {
		const templates = await client.query.conference({
			__args: { id: conferenceId },
			certificateFile: { url: true },
			documentLayouts: true
		});
		await downloadCompleteCertificate(
			// sample check-in sessions, so the layout shows in the test print
			testPrintCertificate([
				m.certificateSampleSessionOpening(),
				m.certificateSampleSessionCommittees(),
				m.certificateSampleSessionClosing()
			]),
			templateOrDefault(templates.certificateFile?.url),
			'test_certificate.pdf',
			resolveDocumentLayout('certificate', withDraft(templates.documentLayouts, draft))
		);
	}

	/** Runs a test print with the busy state shown on the buttons. */
	async function busy(print: () => Promise<void>) {
		loading = true;
		try {
			await print();
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			loading = false;
		}
	}

	const handleGeneratePostalPDF = () => busy(() => printPostal());
	const handleGenerateCertificatePDF = () => busy(() => printCertificate());

	/** A postal test print needs every one of its templates stored. */
	const postalTemplatesStored = $derived(
		!!storedDocuments.contractFile &&
			!!storedDocuments.guardianConsentFile &&
			!!storedDocuments.mediaConsentFile &&
			!!storedDocuments.termsAndConditionsFile
	);

	/** Why the postal test print cannot run yet: it is built from all four templates. */
	const postalTestBlocked = $derived(postalTemplatesStored ? undefined : m.templateTestNeedsAll());

	/** The document whose layout is being edited. */
	let arranging = $state<LayoutDocument>();

	const documentName: Record<LayoutDocument, () => string> = {
		certificate: () => m.certificate(),
		contract: () => m.userAgreement(),
		guardianConsent: () => m.guardianAgreement(),
		mediaConsent: () => m.mediaAgreement()
	};
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
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<TemplateCard
			{form}
			name="contractBasePDF"
			title={m.userAgreement()}
			icon="file-signature"
			stored={storedDocuments.contractFile}
			onplace={() => (arranging = 'contract')}
			ontest={handleGeneratePostalPDF}
			printing={loading}
			testBlocked={postalTestBlocked}
		/>
		<TemplateCard
			{form}
			name="guardianConsentBasePDF"
			title={m.guardianAgreement()}
			icon="shield-halved"
			stored={storedDocuments.guardianConsentFile}
			onplace={() => (arranging = 'guardianConsent')}
			ontest={handleGeneratePostalPDF}
			printing={loading}
			testBlocked={postalTestBlocked}
		/>
		<TemplateCard
			{form}
			name="mediaConsentBasePDF"
			title={m.mediaAgreement()}
			icon="camera"
			stored={storedDocuments.mediaConsentFile}
			onplace={() => (arranging = 'mediaConsent')}
			ontest={handleGeneratePostalPDF}
			printing={loading}
			testBlocked={postalTestBlocked}
		/>
		<TemplateCard
			{form}
			name="termsAndConditionsBasePDF"
			title={m.termsAndConditions()}
			icon="file-lines"
			stored={storedDocuments.termsAndConditionsFile}
			ontest={handleGeneratePostalPDF}
			printing={loading}
			testBlocked={postalTestBlocked}
		/>
	</div>
</FormSection>

<FormSection title={m.certificate()} icon="award">
	{#snippet titleAction()}
		<PdfTemplateHelp />
	{/snippet}
	<TemplateCard
		{form}
		name="certificateBasePDF"
		title={m.certificate()}
		icon="award"
		stored={storedDocuments.certificateFile}
		onplace={() => (arranging = 'certificate')}
		ontest={handleGenerateCertificatePDF}
		printing={loading}
	/>
</FormSection>

{#key arranging}
	{#if arranging}
		{@const document = arranging}
		<DocumentLayoutEditor
			{conferenceId}
			{document}
			title={m.documentLayoutTitle({ document: documentName[document]() })}
			testPrint={(layout) =>
				document === 'certificate'
					? printCertificate({ document, layout })
					: printPostal({ document, layout })}
			onclose={() => (arranging = undefined)}
		/>
	{/if}
{/key}
