<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import codenamize from '$lib/helpers/codenamize';
	import Flag from '$lib/components/Flag.svelte';
	import InfoGrid from '$lib/components/infoGrid';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import SupervisorContentCard from './SupervisorContentCard.svelte';
	import SupervisedParticipantEntry from './SupervisedParticipantEntry.svelte';
	import ApplicationDetailsEntries from './ApplicationDetailsEntries.svelte';
	import RoleApplicationsEntry from './RoleApplicationsEntry.svelte';
	import { fetchPostalConference, supervisedUserSelection } from './supervisedParticipant';

	interface Props {
		conferenceId: string;
		supervisorId: string;
		delegationId: string;
		isStateParticipantRegistration: boolean;
	}

	let { conferenceId, supervisorId, delegationId, isStateParticipantRegistration }: Props =
		$props();

	const [delegation, members, conference] = $derived(
		await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				id: true,
				applied: true,
				entryCode: true,
				school: true,
				experience: true,
				motivation: true,
				appliedForRoles: {
					id: true,
					rank: true,
					nation: { alpha2Code: true },
					nonStateActor: { fontAwesomeIcon: true }
				},
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: { name: true, fontAwesomeIcon: true },
				// Every member, for the count and the "hidden member" rows; only the ones this
				// supervisor supervises are readable in detail, and those come from `members` below.
				members: { id: true, isHeadDelegate: true },
				papers: { id: true, author: { id: true } }
			}),
			client.liveQuery.delegationMembers({
				__args: {
					where: {
						delegationId: { eq: delegationId },
						supervisors: { id: { eq: supervisorId } }
					}
				},
				id: true,
				isHeadDelegate: true,
				assignedCommittee: { abbreviation: true },
				user: supervisedUserSelection
			}),
			fetchPostalConference(conferenceId)
		])
	);

	const hiddenMembers = $derived(
		delegation.members.filter((x) => !members.some((member) => member.id === x.id))
	);
	const roleApplications = $derived(delegation.appliedForRoles.toSorted((a, b) => a.rank - b.rank));
</script>

<SupervisorContentCard
	title={codenamize(delegation.id)}
	{isStateParticipantRegistration}
	applied={delegation.applied}
>
	{#snippet detailSpace()}
		<InfoGrid.Grid>
			{#if isStateParticipantRegistration}
				<InfoGrid.Entry
					title={m.entryCode()}
					fontAwesomeIcon="fa-sharp-duotone fa-solid fa-barcode"
				>
					<span class="font-mono tracking-[0.3rem]">{delegation.entryCode}</span>
				</InfoGrid.Entry>
				<RoleApplicationsEntry
					fontAwesomeIcon="fa-sharp-duotone fa-solid fa-flag"
					applications={roleApplications}
				>
					{#snippet role(roleApplication)}
						<Flag
							size="xs"
							alpha2Code={roleApplication.nation?.alpha2Code}
							nsa={!!roleApplication.nonStateActor}
							icon={roleApplication.nonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
						/>
					{/snippet}
				</RoleApplicationsEntry>
			{:else}
				<InfoGrid.Entry title={m.role()} fontAwesomeIcon="fa-sharp-duotone fa-solid fa-flag">
					<div class="flex items-center gap-2">
						<Flag
							size="xs"
							alpha2Code={delegation.assignedNation?.alpha2Code}
							nsa={!!delegation.assignedNonStateActor}
							icon={delegation.assignedNonStateActor?.fontAwesomeIcon ?? 'fa-hand-point-up'}
						/>
						{#if delegation.assignedNation}
							{getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)}
						{:else if delegation.assignedNonStateActor}
							{delegation.assignedNonStateActor.name}
						{/if}
					</div>
				</InfoGrid.Entry>
			{/if}
			<InfoGrid.Entry
				title={m.delegationMembers()}
				fontAwesomeIcon="fa-sharp-duotone fa-solid fa-users"
				content={delegation.members.length}
			/>
			{#if isStateParticipantRegistration}
				<ApplicationDetailsEntries
					school={delegation.school}
					experience={delegation.experience}
					motivation={delegation.motivation}
				/>
			{/if}
		</InfoGrid.Grid>
	{/snippet}

	{#snippet memberSpace()}
		<DelegationStatusTableWrapper
			withPostalSatus={!isStateParticipantRegistration}
			withPaymentStatus={!isStateParticipantRegistration}
			withCommittee={!isStateParticipantRegistration}
			withPaperCount={!isStateParticipantRegistration}
			withEmail
			title={m.members()}
		>
			{#each members as member (member.id)}
				<SupervisedParticipantEntry
					user={member.user}
					{conferenceId}
					{conference}
					{isStateParticipantRegistration}
					headDelegate={member.isHeadDelegate}
					committee={!isStateParticipantRegistration
						? (member.assignedCommittee?.abbreviation ?? '')
						: undefined}
					withPaperCount={!isStateParticipantRegistration}
					paperCount={delegation.papers.filter((p) => p.author.id === member.user.id).length}
				/>
			{/each}
			{#each hiddenMembers as member (member.id)}
				<tr>
					<td colspan="5" class="text-gray-500 italic">
						{m.hiddenMember()}
						{#if member.isHeadDelegate}
							<div class="tooltip" data-tip={m.headDelegate()}>
								<i class="fa-sharp-duotone fa-solid fa-medal ml-2"></i>
							</div>
						{/if}
					</td>
				</tr>
			{/each}
		</DelegationStatusTableWrapper>
	{/snippet}
</SupervisorContentCard>
