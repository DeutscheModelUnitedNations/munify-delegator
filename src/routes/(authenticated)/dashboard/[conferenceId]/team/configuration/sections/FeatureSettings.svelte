<!--
	@component
	The feature switches as cards: what each does for participants, and what it still needs
	(`#lib/helpers/conferenceFeatures`, the same rules `updateConference` refuses with). A switch
	that lacks something cannot be turned on, only off; one already on while lacking something
	(set up before these rules, or its requirement removed elsewhere) says so.

	Checked against the form, so setting the bank details up and switching payments on can go in
	one save. What lives outside the conference row comes live from `conferenceFeatureContent`.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import type { SuperForm } from 'sveltekit-superforms';
	import { client } from '#lib/api/rumbleClient/client';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import {
		CONFERENCE_FEATURES,
		missingFeatureRequirements,
		type ConferenceFeature
	} from '#lib/helpers/conferenceFeatures';
	import { featureLabel, featureRequirementLabel } from '#lib/helpers/conferenceFeatureLabels';
	import type { ConferenceSettings } from '../form-schema';
	import FeatureCard from './FeatureCard.svelte';

	/** Where a feature's requirements are set up: a tab of this page or another team page. */
	type SetUp = { tab: 'payments' | 'documents' | 'committees' } | { page: 'calendar' | 'guide' };

	let {
		form,
		conferenceId,
		storedTemplates,
		onOpenTab
	}: {
		form: SuperForm<ConferenceSettings>;
		conferenceId: string;
		/** Which postal templates the server holds. */
		storedTemplates: {
			contractFile?: unknown;
			guardianConsentFile?: unknown;
			mediaConsentFile?: unknown;
			termsAndConditionsFile?: unknown;
		};
		onOpenTab: (tab: 'payments' | 'documents' | 'committees') => void;
	} = $props();
	let formData = $derived(form.form);

	const content = $derived(
		await client.liveQuery.conferenceFeatureContent({
			__args: { conferenceId },
			hasAgendaItem: true,
			hasCalendarDay: true,
			hasPublishedGuide: true
		})
	);

	/** A template counts as there when picked, as gone when removed, else as the server has it. */
	const templateThere = (picked: File | null | undefined, stored: unknown) =>
		picked === undefined ? !!stored : picked !== null;

	const missing = $derived(
		missingFeatureRequirements({
			feeAmount: $formData.feeAmount,
			currency: $formData.currency,
			bankAccountHolder: $formData.bankAccountHolder,
			iban: $formData.iban,
			postalName: $formData.postalName,
			postalStreet: $formData.postalStreet,
			postalZip: $formData.postalZip,
			postalCity: $formData.postalCity,
			postalCountry: $formData.postalCountry,
			postalTemplates:
				templateThere($formData.contractBasePDF, storedTemplates.contractFile) &&
				templateThere($formData.guardianConsentBasePDF, storedTemplates.guardianConsentFile) &&
				templateThere($formData.mediaConsentBasePDF, storedTemplates.mediaConsentFile) &&
				templateThere($formData.termsAndConditionsBasePDF, storedTemplates.termsAndConditionsFile),
			hasAgendaItem: content.hasAgendaItem,
			hasCalendarDay: content.hasCalendarDay,
			hasPublishedGuide: content.hasPublishedGuide
		})
	);

	const cards: Record<
		ConferenceFeature,
		{ icon: string; description: () => string; setUp?: SetUp }
	> = {
		unlockPayments: {
			icon: 'credit-card',
			description: m.featurePaymentsDescription,
			setUp: { tab: 'payments' }
		},
		unlockPostals: {
			icon: 'envelope-simple',
			description: m.featurePostalsDescription,
			setUp: { tab: 'documents' }
		},
		isOpenPaperSubmission: {
			icon: 'files',
			description: m.featurePaperSubmissionDescription,
			setUp: { tab: 'committees' }
		},
		showCalendar: {
			icon: 'calendar-dots',
			description: m.featureCalendarDescription,
			setUp: { page: 'calendar' }
		},
		messagingEnabled: { icon: 'chats-circle', description: m.messagingEnabledDescription },
		groupChatsEnabled: { icon: 'users-four', description: m.groupChatsEnabledDescription },
		guidePublished: {
			icon: 'book-open-text',
			description: m.guidePublishedHint,
			setUp: { page: 'guide' }
		}
	};

	/** The card's way to where a feature's requirements are set up. */
	function setUpOf(setUp: SetUp | undefined) {
		if (!setUp) return undefined;
		if ('tab' in setUp) return { onclick: () => onOpenTab(setUp.tab) };
		return { href: resolve(`dashboard/${conferenceId}/team/${setUp.page}`) };
	}
</script>

<FormSection title={m.features()} icon="toggle-right">
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
		{#each CONFERENCE_FEATURES as feature (feature)}
			<FeatureCard
				name={feature}
				title={featureLabel(feature)}
				description={cards[feature].description()}
				icon={cards[feature].icon}
				missing={missing[feature].map(featureRequirementLabel).join(', ')}
				setUp={setUpOf(cards[feature].setUp)}
				bind:checked={$formData[feature]}
			/>
		{/each}
	</ul>
</FormSection>
