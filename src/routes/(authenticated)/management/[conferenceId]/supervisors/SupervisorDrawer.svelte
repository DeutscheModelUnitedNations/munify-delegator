<script lang="ts">
	import { m, singleParticipants } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import formatNames from '$lib/helpers/formatNames';
	import StatusWidgetBoolean from '$lib/components/BooleanStatusWidget.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		conferenceId: string;
		supervisorId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { supervisorId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	function fetchSupervisor(id: string) {
		return client.query.conferenceSupervisor({
			__args: { id },
			id: true,
			plansOwnAttendenceAtConference: true,
			user: person,
			supervisedDelegationMembers: {
				id: true,
				user: person,
				isHeadDelegate: true,
				delegation: {
					id: true,
					entryCode: true,
					applied: true,
					members: { id: true },
					school: true
				}
			},
			supervisedSingleParticipants: {
				id: true,
				school: true,
				applied: true,
				user: person
			}
		});
	}

	let supervisor = $state<Awaited<ReturnType<typeof fetchSupervisor>>>();
	let loading = $state(false);

	async function loadSupervisor(id: string) {
		loading = true;
		try {
			supervisor = await fetchSupervisor(id);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void loadSupervisor(supervisorId);
	});

	const changeAdministrativeStatus = async (plansOwnAttendence: boolean) => {
		if (!supervisor) return;
		await client.mutate.updateConferenceSupervisor({
			__args: { id: supervisor.id, plansOwnAttendenceAtConference: plansOwnAttendence },
			id: true,
			plansOwnAttendenceAtConference: true
		});
		await loadSupervisor(supervisor.id);
	};
</script>

<Drawer
	bind:open
	{onClose}
	category={m.supervisor()}
	title={formatNames(
		supervisor?.user?.givenName ?? undefined,
		supervisor?.user?.familyName ?? undefined,
		{ givenNameFirst: false }
	)}
	id={supervisor?.id ?? 'N/A'}
	{loading}
>
	{#if supervisor?.plansOwnAttendenceAtConference}
		<div class="alert alert-success">
			<i class="fas fa-location-check"></i>
			{m.supervisorPlansOwnAttendance()}
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fas fa-cloud"></i>
			{m.supervisorDoesNotPlanOwnAttendance()}
		</div>
	{/if}
	<StatusWidgetBoolean
		title={m.attendance()}
		faIcon="fa-calendar-check"
		falseicon="fa-cloud"
		trueicon="fa-location-check"
		falsecolor="btn-info"
		status={supervisor?.plansOwnAttendenceAtConference ?? false}
		changeStatus={async (newStatus: boolean) => changeAdministrativeStatus(newStatus)}
	/>
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.delegations()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if supervisor?.supervisedDelegationMembers?.length ?? 0 > 0}
						{@const delegationIds = new Set(
							supervisor?.supervisedDelegationMembers.map((x) => x.delegation.id) ?? []
						)}
						{#each delegationIds ?? [] as delegationId}
							{@const delegation = supervisor?.supervisedDelegationMembers.find(
								(x) => x.delegation.id === delegationId
							)?.delegation}
							<tr>
								<td>
									{#if delegation?.applied}
										<i class="fa-solid fa-circle-check text-success"></i>
									{:else}
										<i class="fa-solid fa-hourglass-half text-error"></i>
									{/if}
								</td>
								<td class="font-mono">
									{delegation?.entryCode}
								</td>
								<td>
									{delegation?.members.length}
								</td>
								<td>
									{delegation?.school}
								</td>
								<td>
									<a
										class="btn btn-sm"
										href={`/management/${conferenceId}/delegations?selected=${delegation?.id}`}
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
							{#each supervisor?.supervisedDelegationMembers?.filter((x) => x.delegation.id === delegationId) ?? [] as member}
								<tr class="text-xs">
									<td class="text-right"><i class="fa-duotone fa-arrow-turn-down-right"></i></td>
									<td colspan="3">
										{member.user.givenName}
										<span class="uppercase">{member.user.familyName}</span>
										{#if member.isHeadDelegate}
											<i class="fa-duotone fa-medal ml-2"></i>
										{/if}
									</td>
									<td>
										<button
											class="btn btn-ghost btn-sm btn-square"
											onclick={() => {
												if (member.user?.id) openUserCard(member.user.id, conferenceId);
											}}
											aria-label="Details"
										>
											<i class="fa-duotone fa-id-card"></i>
										</button>
									</td>
								</tr>
							{/each}
							<tr><td></td></tr>
						{/each}
					{:else}
						<tr>
							<td>{m.noDelegationsFound()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.singleParticipants()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if supervisor?.supervisedSingleParticipants?.length ?? 0 > 0}
						{@const singleParticipants = supervisor?.supervisedSingleParticipants}
						{#each singleParticipants ?? [] as singleParticipant}
							<tr>
								<td>
									{#if singleParticipant?.applied}
										<i class="fa-solid fa-circle-check text-success"></i>
									{:else}
										<i class="fa-solid fa-hourglass-half text-error"></i>
									{/if}
								</td>
								<td class="">
									{singleParticipant.user.givenName}
									<span class="uppercase">{singleParticipant.user.familyName}</span>
								</td>
								<td>
									{singleParticipant?.school}
								</td>
								<td>
									<a
										class="btn btn-sm"
										href={`/management/${conferenceId}/individuals?selected=${singleParticipant?.id}`}
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td>{m.noSingleParticipantsFound()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button
			class="btn"
			onclick={() => {
				const userId = supervisor?.user.id;
				if (userId) openUserCard(userId, conferenceId);
			}}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-id-card"></i>
		</button>
	</div>
</Drawer>
