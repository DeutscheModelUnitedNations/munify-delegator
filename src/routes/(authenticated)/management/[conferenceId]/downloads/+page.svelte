<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { client } from '$lib/api/rumbleClient/client';
	import AllNations from './AllNations.svelte';
	import BadgeData from './BadgeData.svelte';
	import ChaseSeedExport from './ChaseDataExport.svelte';
	import ConferenceRegistrationList from './ConferenceRegistrationList.svelte';
	import CsvSettingsPanel from './CsvSettingsPanel.svelte';
	import DownloadCategoryCard from './DownloadCategoryCard.svelte';
	import ParticipantStatusExport from './ParticipantStatusExport.svelte';

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: page.params.conferenceId! } } },
			id: true,
			name: true,
			abbreviation: true
		})
	);
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.downloads()}</h2>
		<p class="text-base-content/60">{m.downloadsPageDescription()}</p>
	</div>

	<CsvSettingsPanel />

	<DownloadCategoryCard
		title={m.badgeDataTitle()}
		description={m.badgeDataDescription()}
		icon="fas fa-id-badge"
	>
		<BadgeData {committees} conferenceId={page.params.conferenceId!} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.registrationListsTitle()}
		description={m.registrationListsDescription()}
		icon="fas fa-clipboard-list"
	>
		<ConferenceRegistrationList conferenceId={page.params.conferenceId!} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.participantStatusTitle()}
		description={m.participantStatusDescription()}
		icon="fas fa-user-check"
	>
		<ParticipantStatusExport conferenceId={page.params.conferenceId!} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.referenceDataTitle()}
		description={m.referenceDataDescription()}
		icon="fas fa-globe"
	>
		<AllNations conferenceId={page.params.conferenceId!} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.integrationExportsTitle()}
		description={m.integrationExportsDescription()}
		icon="fas fa-plug"
	>
		<ChaseSeedExport conferenceId={page.params.conferenceId!} />
	</DownloadCategoryCard>
</div>
