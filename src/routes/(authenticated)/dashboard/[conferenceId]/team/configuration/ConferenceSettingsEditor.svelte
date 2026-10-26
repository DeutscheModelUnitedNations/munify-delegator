<!--
	@component
	The conference settings: one form spread over tabs, saved in one go after a preview of what
	changes. The committees tab sits outside that form and edits its rows directly.

	Seeds its form once from `conferenceId`, so the parent must remount it (`{#key}`) when the
	conference changes.
-->
<script lang="ts">
	import { normalizeConferenceLanguage } from '#lib/helpers/conferenceLanguage.js';
	import { m } from '#lib/paraglide/messages.js';
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client.js';
	import Form from '#lib/components/form/Form.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { uploadFile, type ConferenceFileField } from '#lib/api/uploadFile.js';
	import { canEditConference, canEditConferenceContent } from '#lib/helpers/teamAccess.js';
	import { fetchTeamAccess } from '#lib/api/teamAccess.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { conferenceSettingsFormSchema, type ConferenceSettings } from './form-schema';
	import { collectConfigChanges } from './changePreview';
	import ConfigChangePreview from './ConfigChangePreview.svelte';
	import CommitteesManager from './committees/CommitteesManager.svelte';
	import TabIntro from './sections/TabIntro.svelte';
	import GeneralSettings from './sections/GeneralSettings.svelte';
	import StatusSettings from './sections/StatusSettings.svelte';
	import LinkSettings from './sections/LinkSettings.svelte';
	import PaymentSettings from './sections/PaymentSettings.svelte';
	import DocumentSettings from './sections/DocumentSettings.svelte';
	import ResolutionManager from './ResolutionManager.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	// Seeded once: these are the form's initial values, and re-reading them while the settings are
	// being edited would discard the edits. The parent remounts this component per conference, so
	// reading the id untracked is what is meant.
	const storedConference = await client.query.conference({
		__args: { id: untrack(() => conferenceId) },
		title: true,
		location: true,
		longTitle: true,
		startAssignment: true,
		registrationDeadlineGracePeriodMinutes: true,
		maxSeatsPerSchool: true,
		startConference: true,
		state: true,
		website: true,
		endConference: true,
		language: true,
		linkToPreparationGuide: true,
		linkToTeamWiki: true,
		linkToServicesPage: true,
		isOpenPaperSubmission: true,
		showCalendar: true,
		timezone: true,
		unlockPayments: true,
		unlockPostals: true,
		feeAmount: true,
		bic: true,
		currency: true,
		bankName: true,
		iban: true,
		accountHolder: true,
		postalName: true,
		postalStreet: true,
		postalApartment: true,
		postalZip: true,
		postalCity: true,
		postalCountry: true
	});

	/** Only project management (and system admins) may change the conference; others look. */
	const access = $derived(await fetchTeamAccess(conferenceId));
	const canEdit = $derived(canEditConference(access));
	/** The content fields are also kept by participant care and the content lead. */
	const canEditContent = $derived(canEditConferenceContent(access));

	/**
	 * What the file backed fields hold on the server: previews for the images, "already uploaded"
	 * markers for the templates. Live, so a save (or another admin's) shows up without bookkeeping.
	 */
	const storedFiles = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			imageFile: { url: true },
			emblemFile: { url: true },
			logoFile: { url: true },
			contractFile: { id: true },
			guardianConsentFile: { id: true },
			mediaConsentFile: { id: true },
			termsAndConditionsFile: { id: true },
			certificateFile: { id: true }
		})
	);

	/**
	 * The stored row as plain values. Field by field on purpose: the generated client hands back a
	 * subscribeable proxy, and spreading that into the form would drag `subscribe` along and widen
	 * every field to `unknown`.
	 */
	const initialSettings: ConferenceSettings = {
		title: storedConference.title,
		longTitle: storedConference.longTitle ?? undefined,
		location: storedConference.location ?? undefined,
		language: normalizeConferenceLanguage(storedConference.language),
		website: storedConference.website ?? undefined,
		startAssignment: storedConference.startAssignment,
		registrationDeadlineGracePeriodMinutes: storedConference.registrationDeadlineGracePeriodMinutes,
		maxSeatsPerSchool: storedConference.maxSeatsPerSchool ?? null,
		startConference: storedConference.startConference,
		endConference: storedConference.endConference,
		state: storedConference.state,
		timezone: storedConference.timezone,
		showCalendar: storedConference.showCalendar,
		isOpenPaperSubmission: storedConference.isOpenPaperSubmission,
		linkToPreparationGuide: storedConference.linkToPreparationGuide ?? undefined,
		linkToTeamWiki: storedConference.linkToTeamWiki ?? undefined,
		linkToServicesPage: storedConference.linkToServicesPage ?? undefined,
		unlockPayments: storedConference.unlockPayments,
		unlockPostals: storedConference.unlockPostals,
		feeAmount: storedConference.feeAmount ?? undefined,
		accountHolder: storedConference.accountHolder ?? undefined,
		iban: storedConference.iban ?? undefined,
		bic: storedConference.bic ?? undefined,
		bankName: storedConference.bankName ?? undefined,
		currency: storedConference.currency ?? undefined,
		postalName: storedConference.postalName ?? undefined,
		postalStreet: storedConference.postalStreet ?? undefined,
		postalApartment: storedConference.postalApartment ?? undefined,
		postalZip: storedConference.postalZip ?? undefined,
		postalCity: storedConference.postalCity ?? undefined,
		postalCountry: storedConference.postalCountry ?? undefined
	};

	/**
	 * What the server currently holds. The change preview diffs the form against this, so it is
	 * updated on a successful save rather than re-read: the page never reloads any more.
	 */
	let savedSettings = $state({ ...initialSettings });

	const form = superForm(defaults(initialSettings, zod4Client(conferenceSettingsFormSchema)), {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(conferenceSettingsFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		async onUpdate({ form: validated }) {
			if (!validated.valid) return;

			// The form carries uploads as `File`; each picked one goes to the storage first and the
			// mutation takes its id. A field left untouched yields `undefined` and keeps what is stored.
			const upload = (field: ConferenceFileField, file: File | undefined) =>
				uploadFile(file, { kind: 'conference', field, conferenceId });
			const {
				image,
				emblem,
				logo,
				contractBasePDF,
				guardianConsentBasePDF,
				mediaConsentBasePDF,
				termsAndConditionsBasePDF,
				certificateBasePDF,
				...settings
			} = validated.data;

			if (!canEdit) {
				// The API only takes the content fields from anyone but project management.
				const content = {
					linkToPreparationGuide: settings.linkToPreparationGuide,
					linkToTeamWiki: settings.linkToTeamWiki,
					linkToServicesPage: settings.linkToServicesPage,
					postalName: settings.postalName,
					postalStreet: settings.postalStreet,
					postalApartment: settings.postalApartment,
					postalZip: settings.postalZip,
					postalCity: settings.postalCity,
					postalCountry: settings.postalCountry,
					state: settings.state,
					unlockPayments: settings.unlockPayments,
					unlockPostals: settings.unlockPostals,
					isOpenPaperSubmission: settings.isOpenPaperSubmission,
					showCalendar: settings.showCalendar
				};
				const promise = client.mutate.updateConference({
					__args: {
						...content,
						id: conferenceId,
						contractFileId: await upload('contract', contractBasePDF),
						guardianConsentFileId: await upload('guardianConsent', guardianConsentBasePDF),
						mediaConsentFileId: await upload('mediaConsent', mediaConsentBasePDF),
						termsAndConditionsFileId: await upload('termsAndConditions', termsAndConditionsBasePDF),
						certificateFileId: await upload('certificate', certificateBasePDF)
					},
					id: true,
					certificateFile: { id: true },
					termsAndConditionsFile: { id: true },
					mediaConsentFile: { id: true },
					guardianConsentFile: { id: true },
					contractFile: { id: true }
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				savedSettings = { ...savedSettings, ...content };
				return;
			}

			// Selecting the file fields lets the cache update `storedFiles` straight from the answer.
			const promise = client.mutate.updateConference({
				__args: {
					...settings,
					// an emptied field lifts the limit rather than leaving it as it was
					maxSeatsPerSchool: settings.maxSeatsPerSchool ?? null,
					id: conferenceId,
					imageFileId: await upload('image', image),
					emblemFileId: await upload('emblem', emblem),
					logoFileId: await upload('logo', logo),
					contractFileId: await upload('contract', contractBasePDF),
					guardianConsentFileId: await upload('guardianConsent', guardianConsentBasePDF),
					mediaConsentFileId: await upload('mediaConsent', mediaConsentBasePDF),
					termsAndConditionsFileId: await upload('termsAndConditions', termsAndConditionsBasePDF),
					certificateFileId: await upload('certificate', certificateBasePDF)
				},
				id: true,
				imageFile: { url: true },
				emblemFile: { url: true },
				logoFile: { url: true },
				certificateFile: { id: true },
				termsAndConditionsFile: { id: true },
				mediaConsentFile: { id: true },
				guardianConsentFile: { id: true },
				contractFile: { id: true }
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;

			savedSettings = { ...settings };
		}
	});
	let formData = $derived(form.form);
	let tainted = $derived(form.tainted);
	let formElement: HTMLFormElement | undefined = $state();

	let confirmSaveModalOpen = $state(false);

	let pendingChanges = $derived(
		collectConfigChanges({
			saved: savedSettings,
			current: $formData,
			tainted: $tainted,
			existingFiles: {
				image: !!storedFiles.imageFile,
				emblem: !!storedFiles.emblemFile,
				logo: !!storedFiles.logoFile,
				contractBasePDF: !!storedFiles.contractFile,
				guardianConsentBasePDF: !!storedFiles.guardianConsentFile,
				mediaConsentBasePDF: !!storedFiles.mediaConsentFile,
				termsAndConditionsBasePDF: !!storedFiles.termsAndConditionsFile,
				certificateBasePDF: !!storedFiles.certificateFile
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
	const params = queryParameters({ tab: true });
	let currentTab = $derived<TabType>(validTabs.find((tab) => tab === params.tab) ?? 'general');

	function setTab(tab: TabType) {
		params.tab = tab;
	}

	const tabs: { value: TabType; label: string; icon: string }[] = $derived([
		{ value: 'general', label: m.general(), icon: 'fa-gear' },
		{ value: 'committees', label: m.committeesAndAgendaItems(), icon: 'fa-podium' },
		{ value: 'status', label: m.statusAndFeatures(), icon: 'fa-toggle-on' },
		{ value: 'links', label: m.linksAndContent(), icon: 'fa-link' },
		{ value: 'payments', label: m.bankingInformation(), icon: 'fa-credit-card' },
		{ value: 'documents', label: m.documentsAndTemplates(), icon: 'fa-file-pdf' }
	]);

	const tabIntros: Record<TabType, () => string> = {
		general: m.tabExplanationGeneral,
		committees: m.tabExplanationCommittees,
		status: m.tabExplanationStatus,
		links: m.tabExplanationLinks,
		payments: m.tabExplanationPayments,
		documents: m.tabExplanationDocuments
	};
	let tabIntro = $derived(tabIntros[currentTab]());

	let saveLabel = $derived(
		pendingChanges.length > 0
			? m.saveSettingsWithChangeCount({ count: pendingChanges.length })
			: m.saveSettings()
	);

	function handleConfirmSave() {
		confirmSaveModalOpen = false;
		if (!canEditContent) return;
		formElement?.requestSubmit();
	}
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-box">
	<h1 class="sr-only">{m.settings()}</h1>

	<!-- One row always: labels truncate (full text in the tooltip) instead of wrapping. -->
	<div class="mb-4">
		<div role="tablist" class="tabs tabs-border flex-nowrap">
			{#each tabs as tab (tab.value)}
				{@const changeCount = changeCountPerTab[tab.value] ?? 0}
				<button
					role="tab"
					class="tab min-w-0 shrink px-3 {currentTab === tab.value ? 'tab-active' : ''}"
					title={tab.label}
					onclick={() => setTab(tab.value)}
				>
					<span class="relative mr-2 shrink-0">
						<i class="fas {tab.icon}"></i>
						{#if changeCount > 0}
							<span
								class="absolute -top-0.5 -left-1.5 flex size-2"
								role="img"
								aria-label={m.configChangeTabIndicator({ count: changeCount })}
							>
								<span
									class="bg-warning absolute inline-flex size-full animate-ping rounded-full opacity-75"
								></span>
								<span class="bg-warning relative inline-flex size-2 rounded-full"></span>
							</span>
						{/if}
					</span>
					<span class="truncate">{tab.label}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if !canEdit}
		<div class="alert alert-info mb-6" role="status">
			<i class="fa-sharp-duotone fa-solid fa-lock"></i>
			<span>
				{canEditContent ? m.conferenceSettingsContentOnly() : m.conferenceSettingsReadOnly()}
			</span>
		</div>
	{/if}

	<!-- What the open tab is for, with the save button on the same row. -->
	<div class="mb-6 flex items-center gap-4">
		<TabIntro>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html tabIntro}
		</TabIntro>
		<button
			type="button"
			class="btn btn-primary btn-sm btn-square shrink-0"
			onclick={() => (confirmSaveModalOpen = true)}
			disabled={!canEditContent || pendingChanges.length === 0}
			title={saveLabel}
			aria-label={saveLabel}
		>
			<i class="fas fa-save"></i>
		</button>
	</div>

	<!-- Committees Tab (outside main form) -->
	<div class:hidden={currentTab !== 'committees'}>
		<div class="flex flex-col gap-4">
			<CommitteesManager {conferenceId} />
		</div>
	</div>

	<!-- A disabled fieldset disables every control inside it, whichever form component renders it. -->
	<Form {form} bind:formElement showSubmitButton={false}>
		<fieldset class="contents" disabled={!canEdit}>
			<div class:hidden={currentTab !== 'general'}>
				<GeneralSettings {form} storedImages={storedFiles} />
			</div>

			<div class:hidden={currentTab !== 'payments'}>
				<PaymentSettings {form} />
			</div>
		</fieldset>

		<!-- Status, features, links, postal address and templates are also kept by participant care and the content lead. -->
		<fieldset class="contents" disabled={!canEditContent}>
			<div class:hidden={currentTab !== 'status'}>
				<StatusSettings {form} />
			</div>

			<div class:hidden={currentTab !== 'links'}>
				<LinkSettings {form} />
			</div>

			<div class:hidden={currentTab !== 'documents'}>
				<DocumentSettings {conferenceId} {form} storedDocuments={storedFiles} />
			</div>
		</fieldset>
	</Form>

	<!-- Resolutions save through their own mutations, so they live outside the settings form. -->
	<fieldset class="contents" disabled={!canEditContent}>
		<div class="mt-6" class:hidden={currentTab !== 'documents'}>
			<ResolutionManager {conferenceId} />
		</div>
	</fieldset>

	<button
		type="button"
		onclick={() => (confirmSaveModalOpen = true)}
		class="btn btn-primary mt-6 w-full"
		disabled={!canEditContent || pendingChanges.length === 0}
	>
		<i class="fas fa-save mr-2"></i>
		{saveLabel}
	</button>
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
