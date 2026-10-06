<script lang="ts">
	import FormDateTimeInput from '$lib/components/Form/FormDateTimeInput.svelte';
	import FormFileInput from '$lib/components/Form/FormFile.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import Form from '$lib/components/Form/Form.svelte';
	import { conferenceSettingsFormSchema } from './form-schema';
	import { toast } from 'svelte-sonner';
	import FormFile from '$lib/components/Form/FormFile.svelte';
	import {
		downloadCompleteCertificate,
		downloadCompletePostalRegistrationPDF,
		type ParticipantData,
		type RecipientData
	} from '$lib/services/pdfGenerator';
	import formatNames from '$lib/services/formatNames';
	import { cache, graphql } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { queryParam } from 'sveltekit-search-params';
	import Modal from '$lib/components/Modal.svelte';
	import { invalidateAll } from '$app/navigation';
	import CommitteesManager from './committees/CommitteesManager.svelte';
	import { canConfigureCommittees } from '$lib/services/managementAccess';
	import ResolutionManager from './ResolutionManager.svelte';
	import ConfigChangePreview from './ConfigChangePreview.svelte';
	import { collectConfigChanges } from './changePreview';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(conferenceSettingsFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult() {
			cache.markStale();
			invalidateAll();
		}
	});
	let formData = $derived(form.form);
	let tainted = $derived(form.tainted);
	let formElement: HTMLFormElement | undefined = $state();

	let confirmSaveModalOpen = $state(false);

	// The values as they are currently stored on the server. `data.form` is
	// re-validated from the database on every (re)load, so this stays in sync after
	// a save.
	let savedSettings = $derived(data.form.data);

	let pendingChanges = $derived(
		collectConfigChanges({
			saved: savedSettings,
			current: $formData,
			tainted: $tainted,
			existingFiles: {
				image: !!data.imageDataURL,
				emblem: !!data.emblemDataURL,
				logo: !!data.logoDataURL,
				contractBasePDF: data.contractContentSet,
				guardianConsentBasePDF: data.guardianConsentContentSet,
				mediaConsentBasePDF: data.mediaConsentContentSet,
				termsAndConditionsBasePDF: data.termsAndConditionsContentSet,
				certificateBasePDF: data.certificateContentSet
			}
		})
	);

	let changeCountPerTab = $derived.by(() => {
		const counts: Partial<Record<TabType, number>> = {};
		for (const change of pendingChanges) {
			counts[change.group] = (counts[change.group] ?? 0) + 1;
		}
		return counts;
	});

	const validTabs = ['general', 'committees', 'status', 'links', 'payments', 'documents'] as const;
	type TabType = (typeof validTabs)[number];
	const tabParam = queryParam('tab');
	let currentTab = $derived<TabType>(
		validTabs.includes($tabParam as TabType) ? ($tabParam as TabType) : 'general'
	);

	function setTab(tab: TabType) {
		$tabParam = tab;
	}

	const tabs: { value: TabType; label: string; icon: string }[] = $derived([
		{ value: 'general', label: m.general(), icon: 'fa-gear' },
		{ value: 'committees', label: m.committeesAndAgendaItems(), icon: 'fa-podium' },
		{ value: 'status', label: m.statusAndFeatures(), icon: 'fa-toggle-on' },
		{ value: 'links', label: m.linksAndContent(), icon: 'fa-link' },
		{ value: 'payments', label: m.bankingInformation(), icon: 'fa-credit-card' },
		{ value: 'documents', label: m.documentsAndTemplates(), icon: 'fa-file-pdf' }
	]);

	type ConferenceState = 'PRE' | 'PARTICIPANT_REGISTRATION' | 'PREPARATION' | 'ACTIVE' | 'POST';

	const conferenceStateOptions: {
		label: string;
		value: ConferenceState;
		description: string;
	}[] = [
		{
			label: m.conferenceStatusPre(),
			value: 'PRE',
			description: m.conferenceStatusPreDescription()
		},
		{
			label: m.conferenceStatusParticipantRegistration(),
			value: 'PARTICIPANT_REGISTRATION',
			description: m.conferenceStatusParticipantRegistrationDescription()
		},
		{
			label: m.conferenceStatusPreparation(),
			value: 'PREPARATION',
			description: m.conferenceStatusPreparationDescription()
		},
		{
			label: m.conferenceStatusActive(),
			value: 'ACTIVE',
			description: m.conferenceStatusActiveDescription()
		},
		{
			label: m.conferenceStatusPost(),
			value: 'POST',
			description: m.conferenceStatusPostDescription()
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

	function handleSaveClick() {
		confirmSaveModalOpen = true;
	}

	function handleConfirmSave() {
		confirmSaveModalOpen = false;
		formElement?.requestSubmit();
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-2xl">
	<h1 class="text-2xl font-bold">{m.settings()}</h1>

	<!-- Tab Navigation -->
	<div role="tablist" class="tabs tabs-border mb-6 flex-wrap">
		{#each tabs as tab (tab.value)}
			{@const changeCount = changeCountPerTab[tab.value] ?? 0}
			<button
				role="tab"
				class="tab {currentTab === tab.value ? 'tab-active' : ''}"
				onclick={() => setTab(tab.value)}
			>
				<i class="fas {tab.icon} mr-2"></i>
				{tab.label}
				{#if changeCount > 0}
					<span
						class="bg-warning ml-2 inline-block size-2 rounded-full"
						aria-label={m.configChangeTabIndicator({ count: changeCount })}
					></span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Committees Tab (outside main form) -->
	<div class:hidden={currentTab !== 'committees'}>
		<div class="alert alert-info mb-6">
			<i class="fa-duotone fa-circle-info"></i>
			<span>{@html m.tabExplanationCommittees()}</span>
		</div>

		<CommitteesManager
			conferenceId={data.conferenceId}
			committees={data.committeesData}
			canConfigure={canConfigureCommittees(data.myMembership)}
			agendaItemForm={data.addAgendaItemForm}
			agendaItemFormAction="?/addAgendaItem"
		/>
	</div>

	<Form {form} bind:formElement showSubmitButton={false} action="?/updateSettings">
		<!-- General Tab -->
		<div class:hidden={currentTab !== 'general'}>
			<div class="alert alert-info mb-6">
				<i class="fas fa-circle-info"></i>
				<span>{@html m.tabExplanationGeneral()}</span>
			</div>

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
				<FormTextInput
					{form}
					name="language"
					placeholder="Deutsch"
					label={m.conferenceLanguage()}
				/>
				<FormTextInput
					{form}
					name="website"
					placeholder="mun-sh.de"
					label={m.conferenceWebsite()}
				/>
				{#if $formData.image || data.imageDataURL}
					<img
						src={$formData.image ? URL.createObjectURL($formData.image) : data.imageDataURL}
						class="h-64 w-64"
						alt="Preview of the file you selected"
					/>
				{/if}
				<FormFileInput {form} name="image" label={m.conferenceImage()} accept="image/*" />
				<div class="mt-4">
					<p class="text-sm opacity-70 mb-2">{m.conferenceEmblem()}</p>
					{#if $formData.emblem || data.emblemDataURL}
						<img
							src={$formData.emblem ? URL.createObjectURL($formData.emblem) : data.emblemDataURL}
							class="h-24 w-24 mb-2"
							alt="Emblem preview"
						/>
					{/if}
					<FormFileInput {form} name="emblem" label={m.conferenceEmblem()} accept="image/svg+xml" />
					<p class="text-xs opacity-50 mt-1">{m.conferenceEmblemHint()}</p>
				</div>
				<div class="mt-4">
					<p class="text-sm opacity-70 mb-2">{m.conferenceLogo()}</p>
					{#if $formData.logo || data.logoDataURL}
						<img
							src={$formData.logo ? URL.createObjectURL($formData.logo) : data.logoDataURL}
							class="h-24 w-24 mb-2"
							alt="Logo preview"
						/>
					{/if}
					<FormFileInput {form} name="logo" label={m.conferenceLogo()} accept="image/*" />
					<p class="text-xs opacity-50 mt-1">{m.conferenceLogoHint()}</p>
				</div>
				<FormDateTimeInput
					{form}
					name="startAssignment"
					label={m.conferenceStartAssignment()}
					enableTime
				/>
				<FormTextInput
					{form}
					name="registrationDeadlineGracePeriodMinutes"
					label={m.registrationDeadlineGracePeriod()}
				/>
				<p class="test-sm mb-2 opacity-50">
					{m.technicalRegistrationDeadline()}: {data.technicalRegistrationDeadline.toLocaleString()}
				</p>
				<FormDateTimeInput {form} name="startConference" label={m.conferenceStart()} />
				<FormDateTimeInput {form} name="endConference" label={m.conferenceEnd()} />
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.conferenceTimezone()}</legend>
					<input
						type="text"
						class="input w-full"
						name="timezone"
						list="timezone-list"
						bind:value={$formData.timezone}
						placeholder="Europe/Berlin"
					/>
					<datalist id="timezone-list">
						{#each Intl.supportedValuesOf('timeZone') as tz}
							<option value={tz}></option>
						{/each}
					</datalist>
					<p class="text-base-content/50 mt-1 text-xs">{m.conferenceTimezoneHint()}</p>
				</fieldset>
			</FormFieldset>
		</div>

		<!-- Status & Features Tab -->
		<div class:hidden={currentTab !== 'status'}>
			<div class="alert alert-info mb-6">
				<i class="fas fa-circle-info"></i>
				<span>{@html m.tabExplanationStatus()}</span>
			</div>

			<FormFieldset title={m.features()}>
				<div class="flex flex-col gap-3">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="toggle toggle-primary"
							name="unlockPayments"
							bind:checked={$formData.unlockPayments}
						/>
						<span class="label-text">{m.paymentOpen()}</span>
					</label>
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="toggle toggle-primary"
							name="unlockPostals"
							bind:checked={$formData.unlockPostals}
						/>
						<span class="label-text">{m.postalOpen()}</span>
					</label>
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="toggle toggle-primary"
							name="isOpenPaperSubmission"
							bind:checked={$formData.isOpenPaperSubmission}
						/>
						<span class="label-text">{m.paperSubmissionOpen()}</span>
					</label>
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="toggle toggle-primary"
							name="showCalendar"
							bind:checked={$formData.showCalendar}
						/>
						<span class="label-text">{m.showCalendar()}</span>
					</label>
				</div>
			</FormFieldset>

			<FormFieldset title={m.conferenceStatus()}>
				<div class="flex flex-col gap-3">
					{#each conferenceStateOptions as option}
						<label
							class="flex items-start gap-3 p-3 rounded-lg border border-base-300 cursor-pointer hover:bg-base-200 transition-colors {$formData.state ===
							option.value
								? 'border-primary bg-primary/5'
								: ''}"
						>
							<input
								type="radio"
								name="state"
								value={option.value}
								class="radio radio-primary mt-0.5"
								checked={$formData.state === option.value}
								onchange={() => ($formData.state = option.value)}
							/>
							<div class="flex flex-col gap-1">
								<span class="font-medium">{option.label}</span>
								<span class="text-sm opacity-70">{option.description}</span>
							</div>
						</label>
					{/each}
				</div>
			</FormFieldset>
		</div>

		<!-- Links & Content Tab -->
		<div class:hidden={currentTab !== 'links'}>
			<div class="alert alert-info mb-6">
				<i class="fas fa-circle-info"></i>
				<span>{@html m.tabExplanationLinks()}</span>
			</div>

			<FormFieldset title={m.links()}>
				<FormTextInput
					{form}
					name="linkToPreparationGuide"
					placeholder="https://path-to-your-guide.com"
					label={m.preparationGuide()}
				/>
				<FormTextInput
					{form}
					name="linkToTeamWiki"
					placeholder="https://wiki.example.com"
					label={m.linkToTeamWiki()}
				/>
				<FormTextInput
					{form}
					name="linkToServicesPage"
					placeholder="https://services.example.com"
					label={m.linkToServicesPage()}
				/>
			</FormFieldset>
		</div>

		<!-- Payments Tab -->
		<div class:hidden={currentTab !== 'payments'}>
			<div class="alert alert-info mb-6">
				<i class="fas fa-circle-info"></i>
				<span>{@html m.tabExplanationPayments()}</span>
			</div>

			<FormFieldset title={m.bankingInformation()}>
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
		</div>

		<!-- Documents Tab -->
		<div class:hidden={currentTab !== 'documents'}>
			<div class="alert alert-info mb-6">
				<i class="fas fa-circle-info"></i>
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
					class="btn dark:btn-outline {loading || !data.certificateContentSet
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
		</div>
	</Form>

	<!-- Resolutions are managed via their own requests, so they must live outside the settings form:
	     otherwise their buttons and inputs would submit ?/updateSettings. -->
	<div class:hidden={currentTab !== 'documents'}>
		<ResolutionManager
			conferenceId={data.conferenceId}
			resolutions={data.resolutionsData}
			committees={data.committeesData}
		/>
	</div>

	<!-- Sticky Save Button -->
	<div class="sticky bottom-4 mt-6 z-10 pointer-events-none">
		<div
			class="bg-base-100/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-base-300 pointer-events-auto max-w-md mx-auto"
		>
			<button
				type="button"
				onclick={handleSaveClick}
				class="btn btn-primary w-full"
				disabled={pendingChanges.length === 0}
			>
				<i class="fas fa-save mr-2"></i>
				{pendingChanges.length > 0
					? m.saveSettingsWithChangeCount({ count: pendingChanges.length })
					: m.saveSettings()}
			</button>
		</div>
	</div>
</div>

<Modal bind:open={confirmSaveModalOpen} title={m.confirmSave()}>
	<ConfigChangePreview changes={pendingChanges} />
	{#snippet action()}
		<button class="btn" onclick={() => (confirmSaveModalOpen = false)}>
			{m.cancel()}
		</button>
		<button
			class="btn btn-primary"
			disabled={pendingChanges.length === 0}
			onclick={handleConfirmSave}
		>
			<i class="fas fa-save mr-2"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>
