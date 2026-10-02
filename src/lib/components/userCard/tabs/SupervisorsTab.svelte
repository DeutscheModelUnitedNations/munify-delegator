<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import PersonName from '../PersonName.svelte';
	import OpenUserCardButton from '../OpenUserCardButton.svelte';
	import AssignSupervisorModal from '../AssignSupervisorModal.svelte';
	import { uniqueSupervisorsByFamilyName } from './supervisorList';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const supervisorSelection = {
		id: true,
		plansOwnAttendenceAtConference: true,
		connectionCode: true,
		user: { id: true, givenName: true, familyName: true }
	} as const;

	/** Supervisors reach a participant through either kind of registration, so both are asked. */
	async function fetchSupervisors(userId: string, conferenceId: string) {
		const forUser = { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } };
		const [delegationMembers, singleParticipants] = await Promise.all([
			client.liveQuery.delegationMembers({
				__args: forUser,
				id: true,
				supervisors: supervisorSelection
			}),
			client.liveQuery.singleParticipants({
				__args: forUser,
				id: true,
				supervisors: supervisorSelection
			})
		]);
		return { delegationMembers, singleParticipants };
	}

	const registrations = $derived(await fetchSupervisors(userId, conferenceId));

	const supervisors = $derived(
		uniqueSupervisorsByFamilyName(
			registrations.delegationMembers.at(0)?.supervisors,
			registrations.singleParticipants.at(0)?.supervisors
		)
	);

	let assignSupervisorModalOpen = $state(false);
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<button class="btn btn-sm" onclick={() => (assignSupervisorModalOpen = true)}>
			<i class="fa-duotone fa-chalkboard-user"></i>
			{m.assignSupervisor()}
		</button>
	</div>

	{#if supervisors.length === 0}
		<div class="alert alert-info">
			<i class="fa-duotone fa-chalkboard-user"></i>
			<span>{m.userCardNoSupervisors()}</span>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>{m.name()}</th>
						<th>{m.connectionCode()}</th>
						<th>{m.attendancePlan()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each supervisors as sup (sup.id)}
						<tr>
							<td>
								<PersonName givenName={sup.user.givenName} familyName={sup.user.familyName} />
							</td>
							<td>
								<code class="bg-base-300 rounded px-1 text-xs">{sup.connectionCode}</code>
							</td>
							<td class="text-center">
								{#if sup.plansOwnAttendenceAtConference}
									<i class="fas fa-check text-success"></i>
								{:else}
									<i class="fas fa-xmark text-error"></i>
								{/if}
							</td>
							<td>
								<OpenUserCardButton user={sup.user} {conferenceId} />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<AssignSupervisorModal bind:open={assignSupervisorModalOpen} {userId} {conferenceId} />
