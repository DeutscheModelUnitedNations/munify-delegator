<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import AllNations from './AllNations.svelte';
	import BadgeData from './BadgeData.svelte';
	import ChaseSeedExport from './ChaseDataExport.svelte';
	import CommitteeMembers from './CommitteeMembers.svelte';
	import ConferenceRegistrationList from './ConferenceRegistrationList.svelte';
	import CsvSettingsPanel from './CsvSettingsPanel.svelte';
	import DownloadCategoryCard from './DownloadCategoryCard.svelte';
	import ParticipantStatusExport from './ParticipantStatusExport.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<p class="text-base-content/60">{m.downloadsPageDescription()}</p>
	</div>

	<CsvSettingsPanel />

	<DownloadCategoryCard
		title={m.badgeDataTitle()}
		description={m.badgeDataDescription()}
		icon="fas fa-id-badge"
	>
		<BadgeData conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.registrationListsTitle()}
		description={m.registrationListsDescription()}
		icon="fas fa-clipboard-list"
	>
		<ConferenceRegistrationList conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.participantStatusTitle()}
		description={m.participantStatusDescription()}
		icon="fas fa-user-check"
	>
		<ParticipantStatusExport conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.committeeDataTitle()}
		description={m.committeeDataDescription()}
		icon="fas fa-landmark"
	>
		<CommitteeMembers conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.referenceDataTitle()}
		description={m.referenceDataDescription()}
		icon="fas fa-globe"
	>
		<AllNations conferenceId={params.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.integrationExportsTitle()}
		description={m.integrationExportsDescription()}
		icon="fas fa-plug"
	>
		<ChaseSeedExport conferenceId={params.conferenceId} />
	</DownloadCategoryCard>
</div>
