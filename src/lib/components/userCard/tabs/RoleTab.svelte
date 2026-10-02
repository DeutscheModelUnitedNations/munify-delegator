<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import Flag from '$lib/components/Flag.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';
	import QuotedText from '../QuotedText.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	/** The person's single participant application or team role, and whether it can be revoked. */
	async function fetchRole(userId: string, conferenceId: string) {
		const forUser = { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } };
		const [singleParticipants, teamMembers, conference] = await Promise.all([
			client.liveQuery.singleParticipants({
				__args: forUser,
				id: true,
				applied: true,
				school: true,
				motivation: true,
				experience: true,
				appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.liveQuery.teamMembers({ __args: forUser, id: true, role: true }),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { singleParticipants, teamMembers, conference };
	}

	const role = $derived(await fetchRole(userId, conferenceId));
	const singleParticipant = $derived(role.singleParticipants.at(0));
	const teamMember = $derived(role.teamMembers.at(0));
	const conferenceState = $derived(role.conference.state);

	const revokeApplication = async (id: string) => {
		if (!confirm(m.confirmRevokeApplication())) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id, applied: false },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	type SingleParticipant = NonNullable<typeof singleParticipant>;
</script>

{#snippet assignmentCard(participant: SingleParticipant)}
	<div class="bg-base-200 rounded-lg p-4">
		<div class="flex items-center gap-3">
			{#if participant.assignedRole}
				<Flag nsa icon={participant.assignedRole.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
				<span class="text-lg font-bold">
					{participant.assignedRole.name}
				</span>
			{:else}
				<NoAssignmentNotice applied={participant.applied} />
			{/if}
		</div>

		{#if participant.school}
			<div class="mt-3 text-sm">
				<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
				<span>{participant.school}</span>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet application(participant: SingleParticipant)}
	{#if participant.motivation || participant.experience || participant.appliedForRoles.length > 0}
		<div class="divider"></div>
	{/if}

	<!-- Motivation & Experience -->
	{#if participant.motivation}
		<QuotedText title={m.motivation()} text={participant.motivation} />
	{/if}
	{#if participant.experience}
		<QuotedText title={m.experience()} text={participant.experience} />
	{/if}

	<!-- Applied For Roles -->
	{#if participant.appliedForRoles.length > 0}
		<div>
			<h3 class="mb-2 text-lg font-bold">{m.appliedForRoles()}</h3>
			<div class="grid grid-cols-[auto_auto_1fr] items-center gap-2">
				{#each participant.appliedForRoles as role, index (role.id)}
					<span class="text-sm text-base-content/60">{index + 1}.</span>
					<Flag nsa icon={role.fontAwesomeIcon} size="xs" />
					<span>{role.name}</span>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-6">
	{#if singleParticipant}
		{@render assignmentCard(singleParticipant)}

		<!-- Action Buttons -->
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<div class="flex gap-2">
				<button
					class="btn btn-error btn-sm {!singleParticipant.applied && 'btn-disabled'}"
					onclick={() => revokeApplication(singleParticipant.id)}
				>
					<i class="fa-solid fa-file-slash"></i>
					{m.revokeApplication()}
				</button>
			</div>
		{/if}

		{@render application(singleParticipant)}
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
