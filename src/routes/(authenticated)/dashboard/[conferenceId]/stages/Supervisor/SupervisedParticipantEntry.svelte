<script lang="ts">
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import getSimplifiedPostalStatus from '$lib/helpers/getSimplifiedPostalStatus';
	import { downloadPostalRegistration } from '$lib/api/postalRegistrationPdf';
	import type { PostalConference, SupervisedUser } from './supervisedParticipant';

	/**
	 * A supervised participant's row in a status table. Postal and payment status only matter once
	 * participants are registered individually rather than by state participant registration.
	 */
	interface Props {
		user: SupervisedUser;
		conferenceId: string;
		conference: PostalConference;
		isStateParticipantRegistration: boolean;
		headDelegate?: boolean;
		committee?: string;
		withPaperCount?: boolean;
		paperCount?: number;
	}

	let {
		user,
		conferenceId,
		conference,
		isStateParticipantRegistration,
		headDelegate,
		committee,
		withPaperCount,
		paperCount
	}: Props = $props();

	const participantStatus = $derived(
		user.conferenceParticipantStatus.find((x) => x.conference.id === conferenceId)
	);
</script>

<DelegationStatusTableEntry
	name={formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}
	pronouns={user.pronouns ?? ''}
	{headDelegate}
	email={user.email}
	{committee}
	withPaymentStatus={!isStateParticipantRegistration}
	withPostalStatus={!isStateParticipantRegistration}
	{withPaperCount}
	{paperCount}
	downloadPostalDocuments={conference.unlockPostals
		? () => downloadPostalRegistration(user.id, conferenceId)
		: undefined}
	postalSatus={getSimplifiedPostalStatus(
		participantStatus,
		ofAgeAtConference(conference.startConference, user.birthday)
	)}
	paymentStatus={participantStatus?.paymentStatus}
/>
