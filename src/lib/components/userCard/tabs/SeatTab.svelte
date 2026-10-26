<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { translateTeamRole } from '#lib/utils/enumTranslations.js';
	import type { TeamroleEnum } from '#lib/api/rumbleClient/client.js';
	import DelegationSeat from '../sections/DelegationSeat.svelte';
	import SingleSeat from '../sections/SingleSeat.svelte';
	import SupervisorSeat from '../sections/SupervisorSeat.svelte';
	import SupervisedBy from '../sections/SupervisedBy.svelte';

	/**
	 * What the person holds in the conference, whatever kind it is: a delegation's role, a single
	 * role, the students they supervise or a team role - and, for students, who supervises them.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		teamRole: TeamroleEnum | null | undefined;
	}

	let { userId, conferenceId, delegationId, singleParticipantId, supervisorId, teamRole }: Props =
		$props();
</script>

<div class="flex flex-col gap-6">
	{#if delegationId}
		<DelegationSeat {delegationId} {conferenceId} {userId} />
	{:else if singleParticipantId}
		<SingleSeat {singleParticipantId} />
	{/if}
	{#if delegationId || singleParticipantId}
		<div class="divider my-0"></div>
		<SupervisedBy {userId} {conferenceId} />
	{/if}
	{#if supervisorId}
		<SupervisorSeat {supervisorId} />
	{/if}
	{#if teamRole !== undefined}
		<section class="flex flex-col gap-2">
			<h3 class="text-lg font-bold">{m.teamMember()}</h3>
			<div class="bg-base-200 rounded-box p-4 text-sm">
				<span class="text-base-content/60">{m.adminUserCardRole()}:</span>
				{teamRole ? translateTeamRole(teamRole) : 'N/A'}
			</div>
		</section>
	{/if}
</div>
