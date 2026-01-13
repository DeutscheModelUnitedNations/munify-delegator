<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import AllNations from './AllNations.svelte';
	import BadgeData from './BadgeData.svelte';
	import ChaseSeedExport from './ChaseDataExport.svelte';
	import ConferenceRegistrationList from './ConferenceRegistrationList.svelte';
	import DownloadCategoryCard from './DownloadCategoryCard.svelte';
	import ParticipantStatusExport from './ParticipantStatusExport.svelte';

	let { data }: { data: PageData } = $props();
	let queryData = $derived(data.DownloadsBaseDataQuery);
	let conferenceData = $derived($queryData.data?.findUniqueConference);
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.downloads()}</h2>
		<p class="text-base-content/60">{m.downloadsPageDescription()}</p>
	</div>

	<DownloadCategoryCard
		title={m.badgeDataTitle()}
		description={m.badgeDataDescription()}
		icon="fas fa-id-badge"
	>
		<BadgeData committees={conferenceData?.committees ?? []} conferenceId={data.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.registrationListsTitle()}
		description={m.registrationListsDescription()}
		icon="fas fa-clipboard-list"
	>
		<ConferenceRegistrationList conferenceId={data.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.participantStatusTitle()}
		description={m.participantStatusDescription()}
		icon="fas fa-user-check"
	>
		<ParticipantStatusExport conferenceId={data.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.referenceDataTitle()}
		description={m.referenceDataDescription()}
		icon="fas fa-globe"
	>
		<AllNations conferenceId={data.conferenceId} />
	</DownloadCategoryCard>

	<DownloadCategoryCard
		title={m.integrationExportsTitle()}
		description={m.integrationExportsDescription()}
		icon="fas fa-plug"
	>
		<ChaseSeedExport conferenceId={data.conferenceId} />
	</DownloadCategoryCard>
</div>
