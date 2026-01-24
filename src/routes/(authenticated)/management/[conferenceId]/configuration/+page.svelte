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
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import Markdown from '$lib/components/Markdown/Markdown.svelte';
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
	import { AddAgendaItemFormSchema } from './committees/form-schema';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	let { data }: { data: PageData } = $props();
	let form = superForm(data.form, {
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(conferenceSettingsFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult(_e) {
			cache.markStale();
			invalidateAll();
		}
	});
	let formData = $derived(form.form);
	let tainted = $derived(form.tainted);
	let formElement: HTMLFormElement | undefined = $state();

	let confirmSaveModalOpen = $state(false);

	// Committees tab - agenda item form
	let agendaForm = superForm(data.addAgendaItemForm, {
		resetForm: true,
		validationMethod: 'oninput',
		validators: zod4Client(AddAgendaItemFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult(_e) {
			cache.markStale();
			invalidateAll();
		}
	});

	// Committee editing state
	let editCommitteeModalOpen = $state(false);
	let editingCommittee = $state<{
		id: string;
		name: string;
		abbreviation: string;
		resolutionHeadline: string | null;
	}>({ id: '', name: '', abbreviation: '', resolutionHeadline: null });

	// Agenda item editing state
	let editAgendaItemModalOpen = $state(false);
	let editingAgendaItem = $state<{
		id: string;
		title: string;
		teaserText: string | null;
	}>({ id: '', title: '', teaserText: null });

	// Delete confirmation state
	let deleteModalOpen = $state(false);
	let deleteConfirmation = $state<{
		id: string;
		title: string;
		paperCount: number;
		confirmText: string;
	}>({ id: '', title: '', paperCount: 0, confirmText: '' });

	const validTabs = ['general', 'committees', 'status', 'links', 'payments', 'documents'] as const;
	type TabType = (typeof validTabs)[number];
	const tabParam = queryParam('tab');
	let currentTab = $derived<TabType>(
		validTabs.includes($tabParam as TabType) ? ($tabParam as TabType) : 'general'
	);

	function setTab(tab: TabType) {
		$tabParam = tab;
	}

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

	// Committee mutations
	const DeleteAgendaItemMutation = graphql(`
		mutation DeleteAgendaItemMutationConfig($id: String!) {
			deleteOneAgendaItem(where: { id: $id }) {
				id
			}
		}
	`);

	const UpdateCommitteeMutation = graphql(`
		mutation UpdateCommitteeMutationConfig(
			$id: String!
			$name: String
			$abbreviation: String
			$resolutionHeadline: String
		) {
			updateOneCommittee(
				where: { id: $id }
				data: { name: $name, abbreviation: $abbreviation, resolutionHeadline: $resolutionHeadline }
			) {
				id
			}
		}
	`);

	const UpdateAgendaItemMutation = graphql(`
		mutation UpdateAgendaItemMutationConfig($id: String!, $title: String!, $teaserText: String) {
			updateOneAgendaItem(
				where: { id: $id }
				data: { title: { set: $title }, teaserText: { set: $teaserText } }
			) {
				id
			}
		}
	`);

	async function saveCommittee() {
		const promise = UpdateCommitteeMutation.mutate({
			id: editingCommittee.id,
			name: editingCommittee.name,
			abbreviation: editingCommittee.abbreviation,
			resolutionHeadline: editingCommittee.resolutionHeadline
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		editCommitteeModalOpen = false;
		cache.markStale();
		invalidateAll();
	}

	async function saveAgendaItem() {
		const promise = UpdateAgendaItemMutation.mutate({
			id: editingAgendaItem.id,
			title: editingAgendaItem.title,
			teaserText: editingAgendaItem.teaserText
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		editAgendaItemModalOpen = false;
		cache.markStale();
		invalidateAll();
	}

	async function confirmDelete() {
		const promise = DeleteAgendaItemMutation.mutate({ id: deleteConfirmation.id });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteModalOpen = false;
		cache.markStale();
		invalidateAll();
	}

	function openEditCommittee(committee: {
		id: string;
		name: string;
		abbreviation: string;
		resolutionHeadline: string | null;
	}) {
		editingCommittee = {
			id: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation,
			resolutionHeadline: committee.resolutionHeadline
		};
		editCommitteeModalOpen = true;
	}

	function openEditAgendaItem(item: { id: string; title: string; teaserText: string | null }) {
		editingAgendaItem = {
			id: item.id,
			title: item.title,
			teaserText: item.teaserText
		};
		editAgendaItemModalOpen = true;
	}

	function openDeleteConfirmation(item: { id: string; title: string; papers: { id: string }[] }) {
		deleteConfirmation = {
			id: item.id,
			title: item.title,
			paperCount: item.papers.length,
			confirmText: ''
		};
		deleteModalOpen = true;
	}

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
		<button
			role="tab"
			class="tab {currentTab === 'general' ? 'tab-active' : ''}"
			onclick={() => setTab('general')}
		>
			<i class="fas fa-gear mr-2"></i>
			{m.general()}
		</button>
		<button
			role="tab"
			class="tab {currentTab === 'committees' ? 'tab-active' : ''}"
			onclick={() => setTab('committees')}
		>
			<i class="fas fa-podium mr-2"></i>
			{m.committeesAndAgendaItems()}
		</button>
		<button
			role="tab"
			class="tab {currentTab === 'status' ? 'tab-active' : ''}"
			onclick={() => setTab('status')}
		>
			<i class="fas fa-toggle-on mr-2"></i>
			{m.statusAndFeatures()}
		</button>
		<button
			role="tab"
			class="tab {currentTab === 'links' ? 'tab-active' : ''}"
			onclick={() => setTab('links')}
		>
			<i class="fas fa-link mr-2"></i>
			{m.linksAndContent()}
		</button>
		<button
			role="tab"
			class="tab {currentTab === 'payments' ? 'tab-active' : ''}"
			onclick={() => setTab('payments')}
		>
			<i class="fas fa-credit-card mr-2"></i>
			{m.bankingInformation()}
		</button>
		<button
			role="tab"
			class="tab {currentTab === 'documents' ? 'tab-active' : ''}"
			onclick={() => setTab('documents')}
		>
			<i class="fas fa-file-pdf mr-2"></i>
			{m.documentsAndTemplates()}
		</button>
	</div>

	<!-- Committees Tab (outside main form) -->
	<div class:hidden={currentTab !== 'committees'}>
		<div class="alert alert-info mb-6">
			<i class="fas fa-circle-info"></i>
			<span>{@html m.tabExplanationCommittees()}</span>
		</div>

		{#each data.committeesData as committee}
			{@const agendaItems = committee.agendaItems}
			<div class="card bg-base-200 shadow-md mb-4">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-bold">{committee.name} ({committee.abbreviation})</h3>
						<button class="btn btn-ghost btn-sm" onclick={() => openEditCommittee(committee)}>
							<i class="fas fa-edit"></i>
							{m.edit()}
						</button>
					</div>
					{#if committee.resolutionHeadline}
						<p class="text-sm opacity-70">
							{m.resolutionHeadline()}: {committee.resolutionHeadline}
						</p>
					{/if}
					{#each agendaItems as item}
						<div class="bg-base-300 flex items-center gap-2 rounded-md px-4 py-2">
							<div class="flex w-full flex-1 flex-col gap-2">
								<h4>{item.title}</h4>
								{#if item.teaserText}
									<p class="text-xs whitespace-pre-wrap">{item.teaserText}</p>
								{/if}
								{#if item.papers.length > 0}
									<span class="badge badge-info badge-sm"
										>{item.papers.length} {item.papers.length === 1 ? 'Paper' : 'Papers'}</span
									>
								{/if}
							</div>
							<button class="btn btn-sm" onclick={() => openEditAgendaItem(item)}>
								<i class="fas fa-edit"></i>
							</button>
							<button
								class="btn btn-error btn-sm"
								aria-label="Delete"
								onclick={() => openDeleteConfirmation(item)}
							>
								<i class="fas fa-xmark"></i>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<FormFieldset title={m.createNewAgendaItem()}>
			<Form form={agendaForm} action="?/addAgendaItem">
				<FormSelect
					form={agendaForm}
					name="committeeId"
					label={m.committee()}
					options={data.committeesData.map((x) => ({ label: x.abbreviation, value: x.id }))}
				/>
				<FormTextInput form={agendaForm} name="title" label={m.title()} />
				<FormTextArea form={agendaForm} name="teaserText" label={m.teaserText()} />
			</Form>
		</FormFieldset>
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

			<FormFieldset title={m.communication()}>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<!-- Editor side -->
					<div class="flex flex-col gap-2 min-w-0">
						<label class="label">
							<span class="label-text">{m.infos()}</span>
						</label>
						<textarea
							class="textarea textarea-bordered h-64 w-full font-mono text-sm"
							name="info"
							bind:value={$formData.info}
							placeholder="# Markdown supported..."
						></textarea>
					</div>
					<!-- Preview side -->
					<div class="flex flex-col gap-2 min-w-0">
						<label class="label">
							<span class="label-text">{m.preview()}</span>
						</label>
						<div
							class="bg-base-200 rounded-lg p-4 h-64 w-full overflow-auto prose prose-sm max-w-none"
						>
							<Markdown source={$formData.info ?? ''} />
						</div>
					</div>
				</div>
				<label class="label cursor-pointer justify-start gap-3 mt-4">
					<input
						type="checkbox"
						class="toggle toggle-primary"
						name="showInfoExpanded"
						bind:checked={$formData.showInfoExpanded}
					/>
					<span class="label-text">{m.showInfoExpandedLabel()}</span>
				</label>
				<p class="text-xs opacity-50 mt-1">{m.showInfoExpandedDescription()}</p>
			</FormFieldset>

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

		<!-- Sticky Save Button -->
		<div class="sticky bottom-4 mt-6 z-10 pointer-events-none">
			<div
				class="bg-base-100/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-base-300 pointer-events-auto max-w-md mx-auto"
			>
				<button
					type="button"
					onclick={handleSaveClick}
					class="btn btn-primary w-full"
					disabled={!$tainted || Object.keys($tainted).length === 0}
				>
					<i class="fas fa-save mr-2"></i>
					{m.saveSettings()}
				</button>
			</div>
		</div>
	</Form>
</div>

<Modal bind:open={confirmSaveModalOpen} title={m.confirmSave()}>
	<p class="py-4">{m.confirmSaveDescription()}</p>
	{#snippet action()}
		<button class="btn" onclick={() => (confirmSaveModalOpen = false)}>
			{m.cancel()}
		</button>
		<button class="btn btn-primary" onclick={handleConfirmSave}>
			<i class="fas fa-save mr-2"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>

<!-- Committee Edit Modal -->
<Modal bind:open={editCommitteeModalOpen} title={m.editCommittee()}>
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.basicInfo()}>
			<div class="flex flex-col gap-4">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.name()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingCommittee.name}
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.abbreviation()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingCommittee.abbreviation}
					/>
				</label>
			</div>
		</FormFieldset>
		<FormFieldset title={m.resolutionHeadline()}>
			<label class="form-control w-full">
				<input
					type="text"
					class="input input-bordered w-full"
					placeholder={m.resolutionHeadlinePlaceholder()}
					bind:value={editingCommittee.resolutionHeadline}
				/>
				<div class="label">
					<span class="label-text-alt opacity-70 break-words whitespace-normal"
						>{m.resolutionHeadlineHint()}</span
					>
				</div>
			</label>
		</FormFieldset>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (editCommitteeModalOpen = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={saveCommittee}>{m.save()}</button>
	{/snippet}
</Modal>

<!-- Agenda Item Edit Modal -->
<Modal bind:open={editAgendaItemModalOpen} title={m.editAgendaItem()}>
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.agendaItemDetails()}>
			<div class="flex flex-col gap-4">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.title()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingAgendaItem.title}
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.teaserText()}</span>
					</div>
					<textarea
						class="textarea textarea-bordered w-full"
						bind:value={editingAgendaItem.teaserText}
					></textarea>
				</label>
			</div>
		</FormFieldset>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (editAgendaItemModalOpen = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={saveAgendaItem}>{m.save()}</button>
	{/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title={m.deleteAgendaItem()}>
	<div class="flex flex-col gap-4">
		{#if deleteConfirmation.paperCount > 0}
			<div class="alert alert-warning">
				<i class="fas fa-exclamation-triangle flex-shrink-0"></i>
				<span class="break-words"
					>{m.agendaItemHasPapers({ count: deleteConfirmation.paperCount })}</span
				>
			</div>
			<FormFieldset title={m.confirmation()}>
				<p class="mb-2 break-words">{m.typeToConfirmDelete({ title: deleteConfirmation.title })}</p>
				<input
					type="text"
					class="input input-bordered w-full"
					placeholder={deleteConfirmation.title}
					bind:value={deleteConfirmation.confirmText}
				/>
			</FormFieldset>
		{:else}
			<p class="break-words">{m.confirmDeleteAgendaItem({ title: deleteConfirmation.title })}</p>
		{/if}
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (deleteModalOpen = false)}>{m.cancel()}</button>
		<button
			class="btn btn-error"
			disabled={deleteConfirmation.paperCount > 0 &&
				deleteConfirmation.confirmText !== deleteConfirmation.title}
			onclick={confirmDelete}
		>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
