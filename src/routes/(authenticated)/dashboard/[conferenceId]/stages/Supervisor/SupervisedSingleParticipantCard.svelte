<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import InfoGrid from '$lib/components/infoGrid';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import SupervisorContentCard from './SupervisorContentCard.svelte';
	import SupervisedParticipantEntry from './SupervisedParticipantEntry.svelte';
	import ApplicationDetailsEntries from './ApplicationDetailsEntries.svelte';
	import RoleApplicationsEntry from './RoleApplicationsEntry.svelte';
	import { fetchPostalConference, supervisedUserSelection } from './supervisedParticipant';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
		isStateParticipantRegistration: boolean;
	}

	let { conferenceId, singleParticipantId, isStateParticipantRegistration }: Props = $props();

	const [singleParticipant, conference] = $derived(
		await Promise.all([
			client.liveQuery.singleParticipant({
				__args: { id: singleParticipantId },
				id: true,
				school: true,
				motivation: true,
				experience: true,
				applied: true,
				appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
				assignedRole: { id: true, name: true, fontAwesomeIcon: true },
				user: supervisedUserSelection
			}),
			fetchPostalConference(conferenceId)
		])
	);
</script>

<SupervisorContentCard
	title={formatNames(
		singleParticipant.user.givenName ?? undefined,
		singleParticipant.user.familyName ?? undefined
	)}
	{isStateParticipantRegistration}
	applied={singleParticipant.applied}
>
	{#snippet detailSpace()}
		<InfoGrid.Grid>
			{#if !singleParticipant.assignedRole}
				<RoleApplicationsEntry
					fontAwesomeIcon="masks-theater"
					applications={singleParticipant.appliedForRoles}
				>
					{#snippet role(roleApplication)}
						<div class="badge">
							<i
								class="fa-sharp-duotone fa-solid fa-{roleApplication.fontAwesomeIcon?.replace(
									'fa-',
									''
								)} mr-2"
							></i>
							{roleApplication.name}
						</div>
					{/snippet}
				</RoleApplicationsEntry>
			{:else}
				<InfoGrid.Entry title={m.role()} fontAwesomeIcon="masks-theater">
					<i
						class="fa-sharp-duotone fa-solid fa-{singleParticipant.assignedRole.fontAwesomeIcon?.replace(
							'fa-',
							''
						)}"
					></i>
					{singleParticipant.assignedRole.name}
				</InfoGrid.Entry>
			{/if}
			{#if isStateParticipantRegistration}
				<ApplicationDetailsEntries
					school={singleParticipant.school}
					experience={singleParticipant.experience}
					motivation={singleParticipant.motivation}
				/>
			{/if}
		</InfoGrid.Grid>
	{/snippet}

	{#snippet memberSpace()}
		<DelegationStatusTableWrapper
			withPostalSatus={!isStateParticipantRegistration}
			withPaymentStatus={!isStateParticipantRegistration}
			withEmail
			title={m.details()}
		>
			<SupervisedParticipantEntry
				user={singleParticipant.user}
				{conferenceId}
				{conference}
				{isStateParticipantRegistration}
			/>
		</DelegationStatusTableWrapper>
	{/snippet}
</SupervisorContentCard>
