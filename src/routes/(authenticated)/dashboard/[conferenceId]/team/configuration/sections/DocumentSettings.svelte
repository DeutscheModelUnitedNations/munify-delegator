<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import { client } from '#lib/api/rumbleClient/client';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import PdfTemplateHelp from '#lib/components/form/PdfTemplateHelp.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF
	} from '#lib/utils/pdfGenerator';
	import {
		templateOrDefault,
		testPrintCertificate,
		testPrintParticipant,
		testPrintRecipient
	} from './testPrintData';
	import { resolveDocumentLayout, type LayoutDocument } from '#lib/helpers/documentLayout';
	import DocumentLayoutEditor from './DocumentLayoutEditor.svelte';
	import TemplateCard from './TemplateCard.svelte';
	import { certificateSampleSessions } from './layoutElements';
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

	// The sessions the certificates list, shown in the layout editor and the test print.
	const sessions = $derived(
		await client.liveQuery.attendanceSessions({
			__args: { where: { conferenceId: { eq: conferenceId }, showOnCertificate: { eq: true } } },
			occasion: true,
			startedAt: true,
			showOnCertificate: true
		})
	);
	const certificateSessions = $derived(certificateSampleSessions(sessions));

	let loading = $state(false);

	/** A layout being edited, printed instead of the stored one for its document. */
	type Draft = { document: LayoutDocument; layout: unknown };

	/** The stored layouts with the draft in its document's place. */
	function withDraft({ stored, draft }: { stored: unknown; draft: Draft | undefined }): unknown {
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
		const documentLayouts = withDraft({ stored: templates.documentLayouts, draft });
		// the switch as it stands in the form, saved or not, so the test print shows it
		const paperScanning = $formData.paperScanning;
		// Real codes, of the person printing: a test print scanned back reads like a participant's
		const { sub: userId } = await getCurrentUser();
		// a minor's, so the guardian consent is part of it
		await downloadCompletePostalRegistrationPDF({
			isOfAge: false,
			participant: testPrintParticipant(),
			issueCodes: async (pages) => {
				const codes = await client.mutate.issueDocumentCodes({
					__args: { conferenceId, userId, pages, layouts: documentLayouts, paperScanning },
					code: true
				});
				return codes.map(({ code }) => code);
			},
			recipient: testPrintRecipient($formData),
			templates: {
				contractFile: templates.contractFile,
				guardianConsentFile: templates.guardianConsentFile,
				mediaConsentFile: templates.mediaConsentFile,
				termsAndConditionsFile: templates.termsAndConditionsFile,
				documentLayouts,
				paperScanning
			},
			fileName: 'test_postal_registration.pdf'
		});
	}

	async function printCertificate(draft?: Draft) {
		const templates = await client.query.conference({
			__args: { id: conferenceId },
			certificateFile: { url: true },
			documentLayouts: true
		});
		await downloadCompleteCertificate(
			// every session on the certificates, as if the holder was at all of them
			{
				data: testPrintCertificate(certificateSessions),
				certificate: templateOrDefault(templates.certificateFile?.url),
				fileName: 'test_certificate.pdf',
				layout: resolveDocumentLayout({
					document: 'certificate',
					stored: withDraft({ stored: templates.documentLayouts, draft })
				}),
				corporate: $formData.qrCorporateDesign
			}
		);
	}

	/** Runs a test print with the busy state shown on the buttons. */
	async function busy(print: () => Promise<void>) {
		loading = true;
		try {
			await print();
		} catch (error) {
			logger.error('Error generating PDF', error);
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
			icon="signature"
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
			icon="shield-check"
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
			icon="file-text"
			stored={storedDocuments.termsAndConditionsFile}
			ontest={handleGeneratePostalPDF}
			printing={loading}
			testBlocked={postalTestBlocked}
		/>
	</div>
	<label class="flex cursor-pointer items-start gap-3">
		<input
			type="checkbox"
			class="toggle toggle-primary"
			name="paperScanning"
			aria-describedby="paper-scanning-description"
			bind:checked={$formData.paperScanning}
		/>
		<span class="flex flex-col gap-0.5">
			<span>{m.paperScanning()}</span>
			<span id="paper-scanning-description" class="text-base-content/60 text-sm">
				{m.paperScanningDescription()}
			</span>
		</span>
	</label>
</FormSection>

<FormSection title={m.certificate()} icon="medal">
	{#snippet titleAction()}
		<PdfTemplateHelp />
	{/snippet}
	<TemplateCard
		{form}
		name="certificateBasePDF"
		title={m.certificate()}
		icon="medal"
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
			{certificateSessions}
			scanning={$formData.paperScanning}
			title={m.documentLayoutTitle({ document: documentName[document]() })}
			testPrint={(layout) =>
				document === 'certificate'
					? printCertificate({ document, layout })
					: printPostal({ document, layout })}
			onclose={() => (arranging = undefined)}
		/>
	{/if}
{/key}
