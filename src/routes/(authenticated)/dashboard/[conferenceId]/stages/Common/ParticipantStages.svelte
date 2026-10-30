<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import type { ConferenceState } from '#lib/data/dashboardLinks';
	import ApplicationRejected from '#lib/components/ApplicationRejected.svelte';
	import AssignmentPending from '#lib/components/AssignmentPending.svelte';
	import ChunkLoadError from '#lib/components/ChunkLoadError.svelte';
	import ConferenceStatusWidget from '../../ConferenceStatusWidget.svelte';
	import type Certificate from './Certificate.svelte';
	import SelectionPendingStage from './SelectionPendingStage.svelte';

	/**
	 * What a delegation member or single participant sees in each phase of the conference: their
	 * registration while it is open; whether they take part in the selection once the deadline has
	 * passed; a wait until the team releases the assignment; once they have a role, their
	 * preparation and finally their certificate; and the rejection if they were not given one.
	 */
	interface Props {
		conferenceId: string;
		conferenceState: ConferenceState;
		userId: string;
		/** Whether the team has released the assignment; until then nobody is accepted or rejected. */
		assignmentReleased: boolean;
		/** Whether the application deadline has passed and the team is selecting. */
		selectionInProgress: boolean;
		/** The application the selection screen reports on. */
		application: ComponentProps<typeof SelectionPendingStage>;
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
		selectionInProgress,
		application,
		accepted,
		status,
		ofAge,
		certificateRole,
		registration,
		preparation
	}: Props = $props();

	let isPreparing = $derived(conferenceState === 'PREPARATION' || conferenceState === 'ACTIVE');
</script>

{#if selectionInProgress}
	<SelectionPendingStage {...application} />
{:else if conferenceState === 'PARTICIPANT_REGISTRATION'}
	{@render registration()}
{:else if !assignmentReleased}
	<AssignmentPending />
{:else if !accepted}
	<!-- A place can only still be handed out while the conference is running. -->
	<ApplicationRejected conferenceIdForWaitingListLink={isPreparing ? conferenceId : undefined} />
{:else if isPreparing}
	<ConferenceStatusWidget {conferenceId} {status} ofAgeAtConference={ofAge} surveyUserId={userId} />
	{@render preparation()}
{:else if conferenceState === 'POST'}
	{#await import('./Certificate.svelte') then { default: LazyCertificate }}
		<LazyCertificate {conferenceId} {userId} didAttend={!!status?.didAttend} {...certificateRole} />
	{:catch error}
		<ChunkLoadError {error} />
	{/await}
{/if}
