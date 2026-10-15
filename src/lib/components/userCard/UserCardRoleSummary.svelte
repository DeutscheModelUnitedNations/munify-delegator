<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import Flag from '../Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { UserCardRoles } from './userCardRoles';
	import { splitRole } from '$lib/helpers/conferenceRole';

	let { delegationMember, singleParticipant, conferenceSupervisor, teamMember }: UserCardRoles =
		$props();

	type DelegationMember = NonNullable<UserCardRoles['delegationMember']>;
	type SingleParticipant = NonNullable<UserCardRoles['singleParticipant']>;
	type TeamMember = NonNullable<UserCardRoles['teamMember']>;
	type Role = NonNullable<DelegationMember['delegation']['assignedRole']>;

	const assignmentName = (role: Role | null) => {
		const { nation, nonStateActor } = splitRole(role);
		return (
			nonStateActor?.name ?? (nation && getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code))
		);
	};
</script>

{#snippet delegationMemberSummary(member: DelegationMember)}
	{@const role = splitRole(member.delegation.assignedRole)}
	{#if role.nation || role.nonStateActor}
		<span class="bg-base-100 rounded-box flex items-center gap-2 py-1 pr-3 pl-1 font-semibold">
			<Flag
				size="xs"
				alpha2Code={role.nation?.alpha2Code}
				nsa={!!role.nonStateActor}
				icon={role.nonStateActor?.fontAwesomeIcon}
			/>
			{assignmentName(member.delegation.assignedRole)}
		</span>
	{:else}
		<span class="badge badge-error badge-soft">{m.noAssignment()}</span>
	{/if}
	{#if member.assignedCommittee}
		<span class="badge badge-soft">
			{member.assignedCommittee.abbreviation}
		</span>
	{/if}
	{#if member.isHeadDelegate}
		<span class="badge badge-accent gap-1">
			<i class="fa-sharp-duotone fa-solid fa-medal"></i>
			{m.headDelegate()}
		</span>
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
	<div class="flex flex-wrap items-center gap-2 text-sm">
		{@render delegationMemberSummary(delegationMember)}
	</div>
{:else if singleParticipant}
	<div class="flex flex-wrap items-center gap-2 text-sm">
		{@render singleParticipantSummary(singleParticipant)}
	</div>
{:else if conferenceSupervisor}
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<span class="badge badge-primary">
			<i class="fa-sharp-duotone fa-solid fa-chalkboard-user mr-1"></i>
			{m.supervisor()}
		</span>
	</div>
{:else if teamMember}
	<div class="flex flex-wrap items-center gap-2 text-sm">
		{@render teamMemberSummary(teamMember)}
	</div>
{/if}
