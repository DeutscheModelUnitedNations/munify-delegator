<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import ConferenceHeader from '$lib/components/dashboard/ConferenceHeader.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import AnnouncementContent from '$lib/components/dashboard/AnnouncementContent.svelte';
	import SurveySection from '$lib/components/dashboard/SurveySection.svelte';
	import ChunkLoadError from '$lib/components/ChunkLoadError.svelte';

	interface Props {
		conferenceId: string;
		userId: string;
		/** Team members see the calendar regardless and never the participant announcement. */
		isTeamMember: boolean;
		/** Surveys are only for people who hold a role at the conference. */
		hasAssignedRole: boolean;
	}

	let { conferenceId, userId, isTeamMember, hasAssignedRole }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			longTitle: true,
			state: true,
			startConference: true,
			endConference: true,
			emblemDataURL: true,
			logoDataURL: true,
			info: true,
			showInfoExpanded: true,
			showCalendar: true,
			timezone: true
		})
	);
</script>

<ConferenceHeader
	title={conference.title}
	longTitle={conference.longTitle}
	state={conference.state}
	startDate={conference.startConference}
	endDate={conference.endConference}
	emblemDataURL={conference.emblemDataURL}
	logoDataURL={conference.logoDataURL}
/>
{#if conference.info && !isTeamMember}
	<DashboardSection
		icon="bullhorn"
		title={m.announcementSectionTitle()}
		description={m.announcementSectionDescription()}
		variant="info"
	>
		<AnnouncementContent info={conference.info} showExpanded={conference.showInfoExpanded} />
	</DashboardSection>
{/if}
{#if conference.showCalendar || isTeamMember}
	{#await import('$lib/components/dashboard/CalendarSection.svelte') then { default: CalendarSection }}
		<CalendarSection conferenceId={conference.id} timezone={conference.timezone} />
	{:catch error}
		<ChunkLoadError {error} />
	{/await}
{/if}
{#if hasAssignedRole && (conference.state === 'PREPARATION' || conference.state === 'ACTIVE')}
	<SurveySection {conferenceId} {userId} conferenceTimezone={conference.timezone} />
{/if}
