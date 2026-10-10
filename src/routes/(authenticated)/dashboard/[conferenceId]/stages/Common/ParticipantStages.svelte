<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import type { ConferenceState } from '$lib/data/dashboardLinks';
	import ApplicationRejected from '$lib/components/ApplicationRejected.svelte';
	import AssignmentPending from '$lib/components/AssignmentPending.svelte';
	import ChunkLoadError from '$lib/components/ChunkLoadError.svelte';
	import ConferenceStatusWidget from '../../ConferenceStatusWidget.svelte';
	import type Certificate from './Certificate.svelte';

	/**
	 * What a delegation member or single participant sees in each phase of the conference: their
	 * registration while it is open; a wait until the team releases the assignment; once they have
	 * a role, their preparation and finally their certificate; and the rejection if they were not
	 * given one.
	 */
	interface Props {
		conferenceId: string;
		conferenceState: ConferenceState;
		userId: string;
		/** Whether the team has released the assignment; until then nobody is accepted or rejected. */
		assignmentReleased: boolean;
		/** Whether the participant was given a role. */
		accepted: boolean;
		status: MyConferenceParticipation['participantStatus'] | null;
		ofAge: boolean;
		/** The role the certificate names. */
		certificateRole: Pick<
			ComponentProps<typeof Certificate>,
			'country' | 'nonStateActor' | 'assignedCommittee' | 'customConferenceRole'
		>;
		registration: Snippet;
		preparation: Snippet;
	}

	let {
		conferenceId,
		conferenceState,
		userId,
		assignmentReleased,
		accepted,
		status,
		ofAge,
		certificateRole,
		registration,
		preparation
	}: Props = $props();

	let isPreparing = $derived(conferenceState === 'PREPARATION' || conferenceState === 'ACTIVE');
</script>

{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
	{@render registration()}
{:else if !assignmentReleased}
	<AssignmentPending />
{:else if !accepted}
	<ApplicationRejected conferenceIdForWaitingListLink={conferenceId} />
{:else if isPreparing}
	<ConferenceStatusWidget {conferenceId} {status} ofAgeAtConference={ofAge} />
	{@render preparation()}
{:else if conferenceState === 'POST'}
	{#await import('./Certificate.svelte') then { default: LazyCertificate }}
		<LazyCertificate {conferenceId} {userId} didAttend={!!status?.didAttend} {...certificateRole} />
	{:catch error}
		<ChunkLoadError {error} />
	{/await}
{/if}
