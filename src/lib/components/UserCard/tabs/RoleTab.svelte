<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/services/enumTranslations';

	interface Props {
		delegationMember?: {
			id: string;
			isHeadDelegate: boolean;
			assignedCommittee?: { id: string; abbreviation: string; name: string } | null;
			delegation: {
				id: string;
				school?: string | null;
				assignedNation?: { alpha2Code: string; alpha3Code: string } | null;
				assignedNonStateActor?: { id: string; name: string; abbreviation: string } | null;
			};
		} | null;
		singleParticipant?: {
			id: string;
			applied: boolean;
			school?: string | null;
			appliedForRoles: Array<{ id: string; name: string; fontAwesomeIcon?: string | null }>;
			assignedRole?: { id: string; name: string; fontAwesomeIcon?: string | null } | null;
		} | null;
		conferenceSupervisor?: {
			id: string;
			plansOwnAttendenceAtConference: boolean;
			connectionCode: string;
		} | null;
		teamMember?: {
			id: string;
			role?: string | null;
		} | null;
	}

	let { delegationMember, singleParticipant, conferenceSupervisor, teamMember }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	<!-- TODO: Add role mutation capabilities via the seats page -->
	<p class="text-base-content/60 text-sm italic">
		{m.userCardRoleDisplayOnly()}
	</p>

	{#if !delegationMember && !singleParticipant && !conferenceSupervisor && !teamMember}
		<div class="alert alert-info">
			<span>{m.userCardNoRole()}</span>
		</div>
	{/if}

	{#if delegationMember}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-2">
				<h3 class="font-bold">{m.delegationMember()}</h3>
				{#if delegationMember.isHeadDelegate}
					<span class="badge badge-primary badge-sm">{m.headDelegate()}</span>
				{/if}
			</div>
			<div class="mt-2 flex flex-col gap-1 text-sm">
				{#if delegationMember.delegation.assignedNation || delegationMember.delegation.assignedNonStateActor}
					<div>
						<span class="text-base-content/60">{m.nation()}:</span>
						{#if delegationMember.delegation.assignedNation}
							<span
								class="fi fi-{delegationMember.delegation.assignedNation.alpha2Code.toLowerCase()} mr-1"
							></span>
							{delegationMember.delegation.assignedNation.alpha3Code}
						{:else if delegationMember.delegation.assignedNonStateActor}
							{delegationMember.delegation.assignedNonStateActor.name}
							({delegationMember.delegation.assignedNonStateActor.abbreviation})
						{/if}
					</div>
				{/if}
				{#if delegationMember.assignedCommittee}
					<div>
						<span class="text-base-content/60">{m.committee()}:</span>
						{delegationMember.assignedCommittee.name} ({delegationMember.assignedCommittee
							.abbreviation})
					</div>
				{/if}
				{#if delegationMember.delegation.school}
					<div>
						<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
						{delegationMember.delegation.school}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if singleParticipant}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-2">
				<h3 class="font-bold">{m.singleParticipant()}</h3>
				{#if !singleParticipant.applied}
					<span class="badge badge-warning badge-sm">{m.notApplied()}</span>
				{/if}
			</div>
			<div class="mt-2 flex flex-col gap-1 text-sm">
				{#if singleParticipant.assignedRole}
					<div>
						<span class="text-base-content/60">{m.assignedRole()}:</span>
						{#if singleParticipant.assignedRole.fontAwesomeIcon}
							<i
								class="fa-duotone fa-{singleParticipant.assignedRole.fontAwesomeIcon.replace(
									'fa-',
									''
								)} mr-1"
							></i>
						{/if}
						{singleParticipant.assignedRole.name}
					</div>
				{/if}
				{#if singleParticipant.appliedForRoles.length > 0}
					<div>
						<span class="text-base-content/60">{m.appliedForRoles()}:</span>
						{#each singleParticipant.appliedForRoles as role, i}
							{#if role.fontAwesomeIcon}
								<i class="fa-duotone fa-{role.fontAwesomeIcon.replace('fa-', '')} mr-0.5"></i>
							{/if}
							{role.name}{i < singleParticipant.appliedForRoles.length - 1 ? ', ' : ''}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if conferenceSupervisor}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-2">
				<h3 class="font-bold">{m.supervisor()}</h3>
			</div>
			<div class="mt-2 flex flex-col gap-1 text-sm">
				<div>
					<span class="text-base-content/60">{m.connectionCode()}:</span>
					<code class="bg-base-300 rounded px-1">{conferenceSupervisor.connectionCode}</code>
				</div>
				<div>
					<span class="text-base-content/60">{m.attendancePlan()}:</span>
					{#if conferenceSupervisor.plansOwnAttendenceAtConference}
						<i class="fas fa-check text-success"></i>
					{:else}
						<i class="fas fa-xmark text-error"></i>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if teamMember}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-2">
				<h3 class="font-bold">{m.teamMember()}</h3>
			</div>
			<div class="mt-2 text-sm">
				<span class="text-base-content/60">{m.adminUserCardRole()}:</span>
				{teamMember.role ? translateTeamRole(teamMember.role) : 'N/A'}
			</div>
		</div>
	{/if}
</div>
