<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import getSimplifiedPostalStatus from '$lib/helpers/getSimplifiedPostalStatus';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';

	interface Props {
		conferenceId: string;
		delegationId: string;
	}

	let { conferenceId, delegationId }: Props = $props();

	const [delegation, conference] = $derived(
		await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				members: {
					id: true,
					isHeadDelegate: true,
					assignedCommittee: { abbreviation: true },
					user: {
						givenName: true,
						familyName: true,
						pronouns: true,
						email: true,
						birthday: true,
						conferenceParticipantStatus: {
							termsAndConditions: true,
							guardianConsent: true,
							mediaConsent: true,
							paymentStatus: true,
							conference: { id: true }
						}
					}
				}
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true })
		])
	);
</script>

<DashboardSection
	icon="users"
	title={m.delegationMembers()}
	description={m.delegationMembersDescription()}
>
	<DelegationStatusTableWrapper withEmail withCommittee withPostalSatus withPaymentStatus>
		{#each delegation.members as member (member.id)}
			{@const participantStatus = member.user.conferenceParticipantStatus.find(
				(x) => x.conference.id === conferenceId
			)}
			<DelegationStatusTableEntry
				name={formatNames(member.user.givenName, member.user.familyName)}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
				email={member.user.email}
				committee={member.assignedCommittee?.abbreviation ?? ''}
				withPaymentStatus
				withPostalStatus
				postalSatus={getSimplifiedPostalStatus(
					participantStatus,
					ofAgeAtConference(conference.startConference, member.user.birthday)
				)}
				paymentStatus={participantStatus?.paymentStatus}
			/>
		{/each}
	</DelegationStatusTableWrapper>
</DashboardSection>
