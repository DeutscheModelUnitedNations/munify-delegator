<script lang="ts">
	import DelegationStatusTableWrapper from '#lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '#lib/components/delegationStatusTable/Entry.svelte';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import getSimplifiedPostalStatus from '#lib/helpers/getSimplifiedPostalStatus';

	interface Props {
		conferenceId: string;
		delegationId: string;
	}

	let { conferenceId, delegationId }: Props = $props();

	// Names only: co-delegates do not read each other's email or birthday, and whether a guardian has
	// to consent comes as a flag on the person's status.
	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			members: {
				id: true,
				isHeadDelegate: true,
				assignedCommittee: { abbreviation: true },
				user: {
					givenName: true,
					familyName: true,
					pronouns: true,
					conferenceParticipants: {
						termsAndConditions: true,
						guardianConsent: true,
						mediaConsent: true,
						paymentStatus: true,
						ofAgeAtConference: true,
						conference: { id: true }
					}
				}
			}
		})
	);
</script>

<DashboardSection
	icon="users"
	title={m.delegationMembers()}
	description={m.delegationMembersDescription()}
>
	<DelegationStatusTableWrapper withCommittee withPostalSatus withPaymentStatus>
		{#each delegation.members as member (member.id)}
			{@const participantStatus = member.user.conferenceParticipants.find(
				(x) => x.conference.id === conferenceId
			)}
			<DelegationStatusTableEntry
				name={formatNames(member.user.givenName, member.user.familyName)}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
				committee={member.assignedCommittee?.abbreviation ?? ''}
				withPaymentStatus
				withPostalStatus
				postalSatus={getSimplifiedPostalStatus(
					participantStatus,
					participantStatus?.ofAgeAtConference ?? false
				)}
				paymentStatus={participantStatus?.paymentStatus}
			/>
		{/each}
	</DelegationStatusTableWrapper>
</DashboardSection>
