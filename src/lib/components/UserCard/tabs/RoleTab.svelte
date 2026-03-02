<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import { singleParticipantResetMutation } from '../../../../routes/(authenticated)/management/[conferenceId]/individuals/individualsResetMutation';
	import { cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	interface Props {
		singleParticipant?: {
			id: string;
			applied: boolean;
			school?: string | null;
			motivation?: string | null;
			experience?: string | null;
			appliedForRoles: Array<{ id: string; name: string; fontAwesomeIcon?: string | null }>;
			assignedRole?: { id: string; name: string; fontAwesomeIcon?: string | null } | null;
		} | null;
		teamMember?: {
			id: string;
			role?: string | null;
		} | null;
		conferenceState?: string | null;
	}

	let { singleParticipant, teamMember, conferenceState }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	{#if singleParticipant}
		<!-- Assignment Card -->
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-3">
				{#if singleParticipant.assignedRole}
					<Flag
						nsa
						icon={singleParticipant.assignedRole.fontAwesomeIcon ?? 'fa-hand-point-up'}
						size="xs"
					/>
					<span class="text-lg font-bold">
						{singleParticipant.assignedRole.name}
					</span>
				{:else}
					<span class="text-base-content/60 italic">{m.noAssignment()}</span>
					{#if singleParticipant.applied}
						<span class="badge badge-success badge-sm">{m.registrationCompleted()}</span>
					{:else}
						<span class="badge badge-warning badge-sm">{m.registrationNotCompleted()}</span>
					{/if}
				{/if}
			</div>

			{#if singleParticipant.school}
				<div class="mt-3 text-sm">
					<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
					<span>{singleParticipant.school}</span>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<div class="flex gap-2">
				<button
					class="btn btn-error btn-sm {!singleParticipant.applied && 'btn-disabled'}"
					onclick={async () => {
						if (!confirm(m.confirmRevokeApplication())) return;
						const promise = singleParticipantResetMutation.mutate({
							singleParticipantId: singleParticipant!.id,
							applied: false
						});
						toast.promise(promise, genericPromiseToastMessages);
						await promise;
						cache.markStale();
						await invalidateAll();
					}}
				>
					<i class="fa-solid fa-file-slash"></i>
					{m.revokeApplication()}
				</button>
			</div>
		{/if}

		{#if singleParticipant.motivation || singleParticipant.experience || singleParticipant.appliedForRoles.length > 0}
			<div class="divider"></div>
		{/if}

		<!-- Motivation & Experience -->
		{#if singleParticipant.motivation}
			<div>
				<h3 class="mb-1 text-lg font-bold">{m.motivation()}</h3>
				<blockquote
					class="border-base-content/20 bg-base-200 select-text rounded-r-lg border-l-4 p-3 text-sm whitespace-pre-wrap italic"
				>
					{singleParticipant.motivation}
				</blockquote>
			</div>
		{/if}
		{#if singleParticipant.experience}
			<div>
				<h3 class="mb-1 text-lg font-bold">{m.experience()}</h3>
				<blockquote
					class="border-base-content/20 bg-base-200 select-text rounded-r-lg border-l-4 p-3 text-sm whitespace-pre-wrap italic"
				>
					{singleParticipant.experience}
				</blockquote>
			</div>
		{/if}

		<!-- Applied For Roles -->
		{#if singleParticipant.appliedForRoles.length > 0}
			<div>
				<h3 class="mb-2 text-lg font-bold">{m.appliedForRoles()}</h3>
				<div class="grid grid-cols-[auto_auto_1fr] items-center gap-2">
					{#each singleParticipant.appliedForRoles as role, index (role.id)}
						<span class="text-sm text-base-content/60">{index + 1}.</span>
						<Flag nsa icon={role.fontAwesomeIcon} size="xs" />
						<span>{role.name}</span>
					{/each}
				</div>
			</div>
		{/if}
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
