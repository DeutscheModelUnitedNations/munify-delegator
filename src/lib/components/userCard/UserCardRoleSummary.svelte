<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import Flag from '../Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import type { UserCardRoles } from './userCardRoles';
	import { splitRole } from '#lib/helpers/conferenceRole';

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

<!-- One quiet line under the name: what the person is, parts separated by a dot -->
{#snippet separator()}
	<span class="text-base-content/30" aria-hidden="true">·</span>
{/snippet}

{#snippet labelled(icon: string, label: string)}
	<span class="flex items-center gap-1.5">
		<i class="fa-sharp-duotone fa-solid {icon} text-base-content/50 text-xs"></i>
		{label}
	</span>
{/snippet}

{#snippet delegationMemberSummary(member: DelegationMember)}
	{@const role = splitRole(member.delegation.assignedRole)}
	<!-- Without a role the stage next to the name says how far the application is -->
	{#if role.nation || role.nonStateActor}
		<span class="flex items-center gap-2 font-semibold">
			<Flag
				size="xs"
				alpha2Code={role.nation?.alpha2Code}
				nsa={!!role.nonStateActor}
				icon={role.nonStateActor?.fontAwesomeIcon}
			/>
			{assignmentName(member.delegation.assignedRole)}
		</span>
	{:else}
		{@render labelled('fa-users', m.delegationMember())}
	{/if}
	{#if member.assignedCommittee}
		{@render separator()}
		<span>{member.assignedCommittee.abbreviation}</span>
	{/if}
	{#if member.isHeadDelegate}
		{@render separator()}
		{@render labelled('fa-medal', m.headDelegate())}
	{/if}
{/snippet}

{#snippet singleParticipantSummary(participant: SingleParticipant)}
	{#if participant.assignedRole}
		<span class="flex items-center gap-1.5 font-semibold">
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
		{@render labelled('fa-user', m.singleParticipant())}
	{/if}
{/snippet}

{#snippet teamMemberSummary(member: TeamMember)}
	{@render labelled('fa-people-group', m.teamMember())}
	{#if member.role}
		{@render separator()}
		<span>{translateTeamRole(member.role)}</span>
	{/if}
{/snippet}

{#if delegationMember || singleParticipant || conferenceSupervisor || teamMember}
	<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
		{#if delegationMember}
			{@render delegationMemberSummary(delegationMember)}
		{:else if singleParticipant}
			{@render singleParticipantSummary(singleParticipant)}
		{:else if conferenceSupervisor}
			{@render labelled('fa-chalkboard-user', m.supervisor())}
		{:else if teamMember}
			{@render teamMemberSummary(teamMember)}
		{/if}
	</div>
{/if}
