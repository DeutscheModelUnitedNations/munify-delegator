<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/services/enumTranslations';

	interface Props {
		singleParticipant?: {
			id: string;
			applied: boolean;
			school?: string | null;
			appliedForRoles: Array<{ id: string; name: string; fontAwesomeIcon?: string | null }>;
			assignedRole?: { id: string; name: string; fontAwesomeIcon?: string | null } | null;
		} | null;
		teamMember?: {
			id: string;
			role?: string | null;
		} | null;
	}

	let { singleParticipant, teamMember }: Props = $props();
</script>

<div class="flex flex-col gap-4">
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
	{:else if teamMember}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-2">
				<h3 class="font-bold">{m.teamMember()}</h3>
			</div>
			<div class="mt-2 text-sm">
				<span class="text-base-content/60">{m.adminUserCardRole()}:</span>
				{teamMember.role ? translateTeamRole(teamMember.role) : 'N/A'}
			</div>
		</div>
	{:else}
		<div class="alert alert-info">
			<span>{m.userCardNoRole()}</span>
		</div>
	{/if}
</div>
