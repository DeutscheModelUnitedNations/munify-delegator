<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import Flag from '../Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { UserCardRoles } from './userCardRoles';

	let { delegationMember, singleParticipant, conferenceSupervisor, teamMember }: UserCardRoles =
		$props();

	type DelegationMember = NonNullable<UserCardRoles['delegationMember']>;
	type SingleParticipant = NonNullable<UserCardRoles['singleParticipant']>;
	type TeamMember = NonNullable<UserCardRoles['teamMember']>;

	const assignmentName = (delegation: DelegationMember['delegation']) =>
		delegation.assignedNonStateActor?.name ??
		(delegation.assignedNation &&
			getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code));
</script>

{#snippet delegationMemberSummary(member: DelegationMember)}
	{@const delegation = member.delegation}
	{#if delegation.assignedNation || delegation.assignedNonStateActor}
		<div class="tooltip tooltip-bottom" data-tip={assignmentName(delegation)}>
			<Flag
				size="sm"
				alpha2Code={delegation.assignedNation?.alpha2Code}
				nsa={!!delegation.assignedNonStateActor}
				icon={delegation.assignedNonStateActor?.fontAwesomeIcon}
			/>
		</div>
	{:else}
		<span class="badge badge-error badge-soft">{m.noAssignment()}</span>
	{/if}
	{#if member.assignedCommittee}
		<span class="badge badge-soft">
			{member.assignedCommittee.abbreviation}
		</span>
	{/if}
	{#if member.isHeadDelegate}
		<span class="badge badge-accent tooltip tooltip-bottom" data-tip={m.headDelegate()}
			><i class="fa-sharp-duotone fa-solid fa-medal"></i></span
		>
	{/if}
{/snippet}

{#snippet singleParticipantSummary(participant: SingleParticipant)}
	{#if !participant.applied}
		<span class="badge badge-warning">{m.notApplied()}</span>
	{/if}
	{#if participant.assignedRole}
		<span class="badge badge-soft gap-1">
			{#if participant.assignedRole.fontAwesomeIcon}
				<i
					class="fa-sharp-duotone fa-solid fa-{participant.assignedRole.fontAwesomeIcon.replace(
						'fa-',
						''
					)}"
				></i>
			{/if}
			{participant.assignedRole.name}
		</span>
	{:else}
		<span class="badge badge-primary">
			<i class="fa-sharp-duotone fa-solid fa-user mr-1"></i>
			{m.singleParticipant()}
		</span>
	{/if}
{/snippet}

{#snippet teamMemberSummary(member: TeamMember)}
	<span class="badge badge-primary">
		<i class="fa-sharp-duotone fa-solid fa-people-group mr-1"></i>
		{m.teamMember()}
	</span>
	{#if member.role}
		<span class="badge badge-soft">
			{translateTeamRole(member.role)}
		</span>
	{/if}
{/snippet}

{#if delegationMember}
	<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
		{@render delegationMemberSummary(delegationMember)}
	</div>
{:else if singleParticipant}
	<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
		{@render singleParticipantSummary(singleParticipant)}
	</div>
{:else if conferenceSupervisor}
	<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
		<span class="badge badge-primary">
			<i class="fa-sharp-duotone fa-solid fa-chalkboard-user mr-1"></i>
			{m.supervisor()}
		</span>
	</div>
{:else if teamMember}
	<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
		{@render teamMemberSummary(teamMember)}
	</div>
{/if}
