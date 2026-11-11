<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AllNations from './AllNations.svelte';
	import BadgeData from './BadgeData.svelte';
	import ChaseSeedExport from './ChaseDataExport.svelte';
	import CheckInTableBadges from './CheckInTableBadges.svelte';
	import CommitteeMembers from './CommitteeMembers.svelte';
	import ConferenceRegistrationList from './ConferenceRegistrationList.svelte';
	import CsvSettingsPanel from './CsvSettingsPanel.svelte';
	import DownloadCategoryCard from './DownloadCategoryCard.svelte';
	import NsaCards from './NsaCards.svelte';
	import ParticipantStatusExport from './ParticipantStatusExport.svelte';
	import RegistrationModeQr from './RegistrationModeQr.svelte';
	import type { PageProps } from './$types';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';

	let { params }: PageProps = $props();

	const chaseLink = $derived(await fetchActiveChaseLink());
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 py-4 sm:p-6 md:p-10">
	<p class="text-base-content/60 text-lg">{m.downloadsPageDescription()}</p>

	<CsvSettingsPanel />

	<DownloadCategoryCard
		title={m.badgeDataTitle()}
		description={m.badgeDataDescription()}
		icon="ph-fill ph-identification-badge"
	>
		<BadgeData conferenceId={params.conferenceId} />
		<NsaCards conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.badgeTablesTitle()}
		description={m.badgeTablesDescription()}
		icon="ph-fill ph-stack"
	>
		<CheckInTableBadges conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.registrationListsTitle()}
		description={m.registrationListsDescription()}
		icon="ph-fill ph-clipboard-text"
	>
		<ConferenceRegistrationList conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.participantStatusTitle()}
		description={m.participantStatusDescription()}
		icon="ph-fill ph-user-check"
	>
		<ParticipantStatusExport conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.registrationModeQrTitle()}
		description={m.registrationModeQrDescription()}
		icon="ph-fill ph-qr-code"
	>
		<RegistrationModeQr conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.committeeDataTitle()}
		description={m.committeeDataDescription()}
		icon="ph-fill ph-bank"
	>
		<CommitteeMembers conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.referenceDataTitle()}
		description={m.referenceDataDescription()}
		icon="ph-fill ph-globe"
	>
		<AllNations conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.integrationExportsTitle()}
		description={m.integrationExportsDescription()}
		icon="ph-fill ph-plug"
	>
		{#if chaseLink}
			<!-- the link keeps CHASE up to date; the file is only a fallback -->
			<details class="w-full">
				<summary class="cursor-pointer text-sm">{m.chaseExportLinkedFallback()}</summary>
				<div class="mt-2"><ChaseSeedExport conferenceId={params.conferenceId} /></div>
			</details>
		{:else}
			<ChaseSeedExport conferenceId={params.conferenceId} />
		{/if}
	</DownloadCategoryCard>
</div>
