<!--
	@component
	The conference settings: one form spread over tabs, saved in one go after a preview of what
	changes. The committees tab sits outside that form and edits its rows directly.

	Seeds its form once from `conferenceId`, so the parent must remount it (`{#key}`) when the
	conference changes.
-->
<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '$lib/api/rumbleClient/client';
	import Form from '$lib/components/form/Form.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { fileToDataURL } from '$lib/helpers/fileToDataURL';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { conferenceSettingsFormSchema, type ConferenceSettings } from './form-schema';
	import { collectConfigChanges } from './changePreview';
	import ConfigChangePreview from './ConfigChangePreview.svelte';
	import CommitteesManager from './committees/CommitteesManager.svelte';
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

	/**
	 * What the file backed fields hold on the server: previews for the images, "already uploaded"
	 * markers for the templates. Live, so a save (or another admin's) shows up without bookkeeping.
	 */
	const storedFiles = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			imageUrl: true,
			emblemUrl: true,
			logoUrl: true,
			contractContentSet: true,
			guardianConsentContentSet: true,
			mediaConsentContentSet: true,
			termsAndConditionsContentSet: true,
			certificateContentSet: true
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
		language: storedConference.language ?? undefined,
		website: storedConference.website ?? undefined,
		startAssignment: storedConference.startAssignment,
		registrationDeadlineGracePeriodMinutes: storedConference.registrationDeadlineGracePeriodMinutes,
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

			// The form carries uploads as `File` while the columns store data URLs, so the conversion
			// happens here; a field left untouched yields `undefined` and keeps what is stored.
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

			// Selecting the file fields lets the cache update `storedFiles` straight from the answer.
			const promise = client.mutate.updateConference({
				__args: {
					...settings,
					id: conferenceId,
					imageDataURL: await fileToDataURL(image),
					emblemDataURL: await fileToDataURL(emblem),
					logoDataURL: await fileToDataURL(logo),
					contractContent: await fileToDataURL(contractBasePDF),
					guardianConsentContent: await fileToDataURL(guardianConsentBasePDF),
					mediaConsentContent: await fileToDataURL(mediaConsentBasePDF),
					termsAndConditionsContent: await fileToDataURL(termsAndConditionsBasePDF),
					certificateContent: await fileToDataURL(certificateBasePDF)
				},
				id: true,
				imageUrl: true,
				emblemUrl: true,
				logoUrl: true,
				certificateContentSet: true,
				termsAndConditionsContentSet: true,
				mediaConsentContentSet: true,
				guardianConsentContentSet: true,
				contractContentSet: true
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
				image: !!storedFiles.imageUrl,
				emblem: !!storedFiles.emblemUrl,
				logo: !!storedFiles.logoUrl,
				contractBasePDF: storedFiles.contractContentSet,
				guardianConsentBasePDF: storedFiles.guardianConsentContentSet,
				mediaConsentBasePDF: storedFiles.mediaConsentContentSet,
				termsAndConditionsBasePDF: storedFiles.termsAndConditionsContentSet,
				certificateBasePDF: storedFiles.certificateContentSet
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
			<i class="fas fa-circle-info"></i>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			<span>{@html m.tabExplanationCommittees()}</span>
		</div>

		<div class="flex flex-col gap-4">
			<CommitteesManager {conferenceId} />
		</div>
	</div>

	<Form {form} bind:formElement showSubmitButton={false}>
		<div class:hidden={currentTab !== 'general'}>
			<GeneralSettings {form} storedImages={storedFiles} />
		</div>

		<div class:hidden={currentTab !== 'status'}>
			<StatusSettings {form} />
		</div>

		<div class:hidden={currentTab !== 'links'}>
			<LinkSettings {form} />
		</div>

		<div class:hidden={currentTab !== 'payments'}>
			<PaymentSettings {form} />
		</div>

		<div class:hidden={currentTab !== 'documents'}>
			<DocumentSettings {conferenceId} {form} storedDocuments={storedFiles} />
		</div>

		<!-- Sticky Save Button -->
		<div class="sticky bottom-4 mt-6 z-10 pointer-events-none">
			<div
				class="bg-base-100/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-base-300 pointer-events-auto max-w-md mx-auto"
			>
				<button
					type="button"
					onclick={() => (confirmSaveModalOpen = true)}
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
	</Form>

	<!-- Resolutions save through their own mutations, so they live outside the settings form. -->
	<div class="mt-6" class:hidden={currentTab !== 'documents'}>
		<ResolutionManager {conferenceId} />
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
