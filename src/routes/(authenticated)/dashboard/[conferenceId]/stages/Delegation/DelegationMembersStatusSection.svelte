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

	// Names and email addresses, so co-delegates can get in touch; no birthday: whether a guardian has
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
					email: true,
					// Only this conference's row: the caller may read a person's rows elsewhere (their own
					// left over after a withdrawal) without reading that conference
					conferenceParticipants: {
						__args: { where: { conferenceId: { eq: conferenceId } } },
						termsAndConditions: true,
						guardianConsent: true,
						mediaConsent: true,
						paymentStatus: true,
						ofAgeAtConference: true
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
	<DelegationStatusTableWrapper withCommittee withEmail withPostalSatus withPaymentStatus>
		{#each delegation.members as member (member.id)}
			{@const participantStatus = member.user.conferenceParticipants.at(0)}
			<DelegationStatusTableEntry
				name={formatNames({ givenName: member.user.givenName, familyName: member.user.familyName })}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
				committee={member.assignedCommittee?.abbreviation ?? ''}
				email={member.user.email}
				withPaymentStatus
				withPostalStatus
				postalSatus={getSimplifiedPostalStatus({
					participantStatus,
					ofAge: participantStatus?.ofAgeAtConference ?? false
				})}
				paymentStatus={participantStatus?.paymentStatus}
			/>
		{/each}
	</DelegationStatusTableWrapper>
</DashboardSection>
