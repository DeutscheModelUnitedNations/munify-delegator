<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/services/formatNames';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		userId: string;
		conferenceId: string;
		onUpdate?: () => void;
	}

	let { userId, conferenceId, onUpdate }: Props = $props();

	const supervisorsQuery = graphql(`
		query UserCardSupervisorsQuery($conferenceId: String!, $userId: String!) {
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				supervisors {
					id
					plansOwnAttendenceAtConference
					connectionCode
					user {
						id
						given_name
						family_name
					}
				}
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				supervisors {
					id
					plansOwnAttendenceAtConference
					connectionCode
					user {
						id
						given_name
						family_name
					}
				}
			}
		}
	`);

	$effect(() => {
		supervisorsQuery.fetch({ variables: { conferenceId, userId } });
	});

	let supervisors = $derived.by(() => {
		const dmSupervisors = $supervisorsQuery.data?.findManyDelegationMembers?.[0]?.supervisors ?? [];
		const spSupervisors =
			$supervisorsQuery.data?.findManySingleParticipants?.[0]?.supervisors ?? [];
		const map = new SvelteMap<
			string,
			{
				id: string;
				plansOwnAttendenceAtConference: boolean;
				connectionCode: string;
				user: { id: string; given_name: string; family_name: string };
			}
		>();
		for (const s of [...dmSupervisors, ...spSupervisors]) {
			map.set(s.id, s);
		}
		return [...map.values()].sort((a, b) =>
			`${a.user.family_name}`.localeCompare(`${b.user.family_name}`)
		);
	});

	// Assign supervisor
	let assignSupervisorModalOpen = $state(false);

	const supervisorListQuery = graphql(`
		query UserCardSupervisorList($conferenceId: String!) {
			findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
				id
				connectionCode
				user {
					id
					given_name
					family_name
				}
			}
		}
	`);

	const assignSupervisorMutation = graphql(`
		mutation UserCardAssignSupervisor($conferenceId: ID!, $userId: ID, $connectionCode: String!) {
			connectToConferenceSupervisor(
				conferenceId: $conferenceId
				userId: $userId
				connectionCode: $connectionCode
			) {
				id
			}
		}
	`);

	const assignSupervisor = async (connectionCode: string) => {
		const promise = assignSupervisorMutation.mutate({
			conferenceId,
			userId,
			connectionCode
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		assignSupervisorModalOpen = false;
		cache.markStale();
		await invalidateAll();
		supervisorsQuery.fetch({ variables: { conferenceId, userId } });
		onUpdate?.();
	};

	$effect(() => {
		if (assignSupervisorModalOpen) {
			supervisorListQuery.fetch({ variables: { conferenceId } });
		}
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<button class="btn btn-sm" onclick={() => (assignSupervisorModalOpen = true)}>
			<i class="fa-duotone fa-chalkboard-user"></i>
			{m.assignSupervisor()}
		</button>
	</div>

	{#if $supervisorsQuery.fetching}
		<div class="flex flex-col gap-3">
			<div class="skeleton h-16 w-full"></div>
			<div class="skeleton h-16 w-full"></div>
		</div>
	{:else if supervisors.length === 0}
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
								<span class="capitalize">{sup.user.given_name}</span>
								<span class="uppercase">{sup.user.family_name}</span>
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
								<button
									class="btn btn-ghost btn-xs btn-square"
									onclick={() => openUserCard(sup.user.id, conferenceId)}
									title={formatNames(sup.user.given_name, sup.user.family_name, {
										givenNameFirst: true
									})}
								>
									<i class="fa-duotone fa-id-card"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<Modal bind:open={assignSupervisorModalOpen} title={m.assignSupervisor()}>
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th></th>
					<th>{m.name()}</th>
				</tr>
			</thead>
			<tbody>
				{#if $supervisorListQuery.fetching}
					<tr>
						<td colspan="2">
							<div class="skeleton h-8 w-full"></div>
						</td>
					</tr>
				{:else if $supervisorListQuery.data?.findManyConferenceSupervisors && $supervisorListQuery.data.findManyConferenceSupervisors.length !== 0}
					{#each $supervisorListQuery.data.findManyConferenceSupervisors.sort( (a, b) => `${a.user.family_name}${a.user.given_name}`.localeCompare(`${b.user.family_name}${b.user.given_name}`) ) as supervisor (supervisor.id)}
						<tr>
							<td>
								<button
									class="btn btn-sm"
									aria-label={m.assignSupervisor()}
									onclick={() => assignSupervisor(supervisor.connectionCode)}
								>
									<i class="fa-duotone fa-plus"></i>
								</button>
							</td>
							<td>
								<span class="capitalize">{supervisor.user.given_name}</span>
								<span class="uppercase">{supervisor.user.family_name}</span>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="2" class="text-center">
							{m.noSingleParticipantsFound()}
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</Modal>
