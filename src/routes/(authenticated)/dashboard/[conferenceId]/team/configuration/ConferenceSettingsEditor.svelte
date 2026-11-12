<!--
	@component
	The conference settings: one form spread over tabs, saved in one go after a preview of what
	changes. The committees tab sits outside that form and edits its rows directly. The automatic
	mails have their own page (`team/emails`).

	Seeds its form once from `conferenceId`, so the parent must remount it (`{#key}`) when the
	conference changes.
-->
<script lang="ts">
	import { normalizeConferenceLanguage } from '#lib/helpers/conferenceLanguage';
	import { m } from '#lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { client } from '#lib/api/rumbleClient/client';
	import Form from '#lib/components/form/Form.svelte';
	import { uploadFile, type ConferenceFileField } from '#lib/api/uploadFile';
	import { canEditConference, canEditConferenceContent } from '#lib/helpers/teamAccess';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { conferenceSettingsFormSchema, limitArgs, type ConferenceSettings } from './form-schema';
	import { collectConfigChanges, type ChangeGroupKey } from './changePreview';
	import ConfigSave from './ConfigSave.svelte';
	import CommitteesManager from './committees/CommitteesManager.svelte';
	import TabIntro from './sections/TabIntro.svelte';
	import GeneralSettings from './sections/GeneralSettings.svelte';
	import StatusSettings from './sections/StatusSettings.svelte';
	import AgeSettings from './sections/AgeSettings.svelte';
	import LinkSettings from './sections/LinkSettings.svelte';
	import PaymentSettings from './sections/PaymentSettings.svelte';
	import DocumentSettings from './sections/DocumentSettings.svelte';
	import ResolutionManager from './ResolutionManager.svelte';
	import EmailPrompt from '#lib/components/email/EmailPrompt.svelte';
	import { createEmailPrompt } from '#lib/components/email/emailPrompt.svelte.js';
	import { settingsEmailKinds } from '#lib/helpers/emailKinds';

	let { conferenceId }: { conferenceId: string } = $props();

	// Seeded once: these are the form's initial values, and re-reading them while the settings are
	// being edited would discard the edits. The parent remounts this component per conference, so
	// reading the id untracked is what is meant.
	const storedConference = await client.query.conference({
		__args: { id: untrack(() => conferenceId) },
		title: true,
		location: true,
		longTitle: true,
		applicationDeadline: true,
		registrationDeadlineGracePeriodMinutes: true,
		maxCollectiveGroupSize: true,
		maxGuaranteedSeatsPerForeignSchool: true,
		maxForeignGuaranteedSeatsPercent: true,
		participantMinAge: true,
		participantMaxAge: true,
		supervisorMinAge: true,
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
		bankAccountHolder: true,
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

	/** Unlocking the paperwork or ending the conference sends nothing; the mails are offered after. */
	const emailPrompt = createEmailPrompt();
	const offerEmailsFor = (changedFields: string[]) =>
		emailPrompt.offer({ conferenceId, kinds: settingsEmailKinds(changedFields) });

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
			contractFile: { url: true },
			guardianConsentFile: { url: true },
			mediaConsentFile: { url: true },
			termsAndConditionsFile: { url: true },
			certificateFile: { url: true }
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
		applicationDeadline: storedConference.applicationDeadline,
		registrationDeadlineGracePeriodMinutes: storedConference.registrationDeadlineGracePeriodMinutes,
		maxCollectiveGroupSize: storedConference.maxCollectiveGroupSize ?? null,
		maxGuaranteedSeatsPerForeignSchool: storedConference.maxGuaranteedSeatsPerForeignSchool ?? null,
		maxForeignGuaranteedSeatsPercent: storedConference.maxForeignGuaranteedSeatsPercent ?? null,
		participantMinAge: storedConference.participantMinAge ?? null,
		participantMaxAge: storedConference.participantMaxAge ?? null,
		supervisorMinAge: storedConference.supervisorMinAge ?? null,
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
		bankAccountHolder: storedConference.bankAccountHolder ?? undefined,
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
			const changedFields = pendingChanges.map((change) => change.key);

			// The form carries uploads as `File`; each picked one goes to the storage first and the
			// mutation takes its id. A field left untouched yields `undefined` and keeps what is stored,
			// a removed image `null`, which deletes it.
			const upload = async ({
				field,
				file
			}: {
				field: ConferenceFileField;
				file: File | null | undefined;
			}) =>
				file === null
					? null
					: uploadFile({ file, target: { kind: 'conference', field, conferenceId } });
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
			// The document templates, which content roles may change too.
			const uploadDocuments = async () => ({
				contractFileId: await upload({ field: 'contract', file: contractBasePDF }),
				guardianConsentFileId: await upload({
					field: 'guardianConsent',
					file: guardianConsentBasePDF
				}),
				mediaConsentFileId: await upload({ field: 'mediaConsent', file: mediaConsentBasePDF }),
				termsAndConditionsFileId: await upload({
					field: 'termsAndConditions',
					file: termsAndConditionsBasePDF
				}),
				certificateFileId: await upload({ field: 'certificate', file: certificateBasePDF })
			});
			const documentFiles = {
				certificateFile: { url: true },
				termsAndConditionsFile: { url: true },
				mediaConsentFile: { url: true },
				guardianConsentFile: { url: true },
				contractFile: { url: true }
			} as const;

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
						...(await uploadDocuments())
					},
					id: true,
					...documentFiles
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				savedSettings = { ...savedSettings, ...content };
				void offerEmailsFor(changedFields);
				return;
			}

			// Selecting the file fields lets the cache update `storedFiles` straight from the answer.
			const promise = client.mutate.updateConference({
				__args: {
					...settings,
					...limitArgs(settings),
					id: conferenceId,
					imageFileId: await upload({ field: 'image', file: image }),
					emblemFileId: await upload({ field: 'emblem', file: emblem }),
					logoFileId: await upload({ field: 'logo', file: logo }),
					...(await uploadDocuments())
				},
				id: true,
				imageFile: { url: true },
				emblemFile: { url: true },
				logoFile: { url: true },
				...documentFiles
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;

			savedSettings = { ...settings };
			void offerEmailsFor(changedFields);
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
		const counts: Partial<Record<TabType | ChangeGroupKey, number>> = {};
		for (const change of pendingChanges) {
			counts[change.group] = (counts[change.group] ?? 0) + 1;
		}
		return counts;
	});

	const validTabs = ['general', 'committees', 'status', 'links', 'payments', 'documents'] as const;
	type TabType = (typeof validTabs)[number];
	// The tab is kept here and mirrored into the URL without a navigation, like the assignment
	// board's size: `sveltekit-search-params` reads `page`, which is still the placeholder while the
	// tabs' first queries are pending, and a tab container updated in that window stayed hidden.
	let pickedTab = $state(page.url.searchParams.get('tab'));
	let currentTab = $derived<TabType>(validTabs.find((tab) => tab === pickedTab) ?? 'general');

	function setTab(tab: TabType) {
		pickedTab = tab;
		// On the next task: a shallow `goto` writes `page`, which must not happen while Svelte is
		// still committing the tab switch
		setTimeout(() => {
			// The browser's own URL: `page.url` does not follow shallow navigations
			const url = new URL(location.href);
			url.searchParams.set('tab', tab);
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page's own URL, with another tab
			goto(url, { shallow: true, replace: true, state: page.state });
		});
	}

	const tabs: { value: TabType; label: string; icon: string }[] = $derived([
		{ value: 'general', label: m.general(), icon: 'ph-gear' },
		{ value: 'committees', label: m.committeesAndAgendaItems(), icon: 'ph-lectern' },
		{ value: 'status', label: m.statusAndFeatures(), icon: 'ph-toggle-right' },
		{ value: 'links', label: m.linksAndContent(), icon: 'ph-link' },
		{ value: 'payments', label: m.bankingInformation(), icon: 'ph-credit-card' },
		{ value: 'documents', label: m.documentsAndTemplates(), icon: 'ph-file-pdf' }
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
</script>

<div class="card-body bg-base-100 dark:bg-base-200 rounded-box max-sm:px-3">
	<h1 class="sr-only">{m.settings()}</h1>

	<!-- One row always: labels truncate (full text in the tooltip) instead of wrapping; phones show only the icons. -->
	<div class="mb-4">
		<div role="tablist" class="tabs tabs-border flex-nowrap">
			{#each tabs as tab (tab.value)}
				{@const changeCount = changeCountPerTab[tab.value] ?? 0}
				<button
					role="tab"
					class="tab min-w-0 shrink px-3 {currentTab === tab.value ? 'tab-active' : ''}"
					aria-selected={currentTab === tab.value}
					title={tab.label}
					onclick={() => setTab(tab.value)}
				>
					<span class="relative shrink-0 sm:mr-2">
						<i aria-hidden="true" class="ph-fill {tab.icon}"></i>
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
					<span class="truncate max-sm:sr-only">{tab.label}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if !canEdit}
		<div class="alert alert-info mb-6" role="status">
			<i aria-hidden="true" class="ph-duotone ph-lock"></i>
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
			<i aria-hidden="true" class="ph-fill ph-floppy-disk"></i>
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
				<AgeSettings {form} />
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

	<ConfigSave
		bind:open={confirmSaveModalOpen}
		changes={pendingChanges}
		label={saveLabel}
		mayEdit={canEditContent}
		onconfirm={() => formElement?.requestSubmit()}
	/>
</div>

<EmailPrompt prompt={emailPrompt} />
