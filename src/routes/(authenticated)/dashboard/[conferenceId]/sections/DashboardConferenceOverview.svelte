<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import ConferenceHeader from '#lib/components/dashboard/ConferenceHeader.svelte';
	import AnnouncementFeed from '#lib/components/announcement/AnnouncementFeed.svelte';
	import SurveySection from '#lib/components/dashboard/SurveySection.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		conferenceId: string;
		/** Left out for a visitor who is not signed in */
		userId?: string;
		/** Surveys are only for people who hold a role at the conference. */
		hasAssignedRole: boolean;
		/** Shown right under the header, before everything else: the caller's quick links. */
		afterHeader?: Snippet;
	}

	let { conferenceId, userId, hasAssignedRole, afterHeader }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			longTitle: true,
			state: true,
			startConference: true,
			endConference: true,
			emblemFile: { url: true },
			logoFile: { url: true },
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
	emblemUrl={conference.emblemFile?.url}
	logoUrl={conference.logoFile?.url}
/>
{@render afterHeader?.()}
{#if userId}
	<!-- what is out for the caller's part in the conference, the team's included -->
	<AnnouncementFeed {conferenceId} limit={3} />
{/if}
{#if userId && hasAssignedRole && (conference.state === 'PREPARATION' || conference.state === 'ACTIVE')}
	<SurveySection {conferenceId} {userId} conferenceTimezone={conference.timezone} />
{/if}
