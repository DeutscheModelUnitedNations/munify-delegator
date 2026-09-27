<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		userId: string;
		conferenceId: string;
		onUpdate?: () => void;
	}

	let { userId, conferenceId, onUpdate }: Props = $props();

	const supervisorSelection = {
		id: true,
		plansOwnAttendenceAtConference: true,
		connectionCode: true,
		user: { id: true, givenName: true, familyName: true }
	} as const;

	/** Supervisors reach a participant through either kind of registration, so both are asked. */
	async function fetchSupervisors() {
		const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: userId } };

		const [delegationMembers, singleParticipants] = await Promise.all([
			client.query.delegationMembers({
				__args: { where: forUser },
				id: true,
				supervisors: supervisorSelection
			}),
			client.query.singleParticipants({
				__args: { where: forUser },
				id: true,
				supervisors: supervisorSelection
			})
		]);

		return [
			...(delegationMembers.at(0)?.supervisors ?? []),
			...(singleParticipants.at(0)?.supervisors ?? [])
		];
	}

	type SupervisorRow = Awaited<ReturnType<typeof fetchSupervisors>>[number];

	let loadedSupervisors = $state<SupervisorRow[]>([]);
	let supervisorsLoading = $state(false);

	async function loadSupervisors() {
		supervisorsLoading = true;
		try {
			loadedSupervisors = await fetchSupervisors();
		} finally {
			supervisorsLoading = false;
		}
	}

	$effect(() => {
		void loadSupervisors();
	});

	let supervisors = $derived.by(() => {
		// The same person can supervise both registrations, so dedupe before sorting.
		const byId = new SvelteMap<string, SupervisorRow>();
		for (const supervisor of loadedSupervisors) {
			byId.set(supervisor.id, supervisor);
		}
		return [...byId.values()].sort((a, b) =>
			(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
		);
	});

	// Assign supervisor
	let assignSupervisorModalOpen = $state(false);

	function fetchSupervisorList() {
		return client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			connectionCode: true,
			user: { id: true, givenName: true, familyName: true }
		});
	}

	let supervisorList = $state<Awaited<ReturnType<typeof fetchSupervisorList>>>();
	let supervisorListLoading = $state(false);

	const assignSupervisor = async (connectionCode: string) => {
		const promise = client.mutate.connectToConferenceSupervisor({
			__args: { conferenceId, userId, connectionCode },
			id: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		assignSupervisorModalOpen = false;
		await loadSupervisors();
		onUpdate?.();
	};

	$effect(() => {
		if (!assignSupervisorModalOpen) return;
		supervisorListLoading = true;
		void fetchSupervisorList()
			.then((result) => {
				supervisorList = result;
			})
			.finally(() => {
				supervisorListLoading = false;
			});
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<button class="btn btn-sm" onclick={() => (assignSupervisorModalOpen = true)}>
			<i class="fa-duotone fa-chalkboard-user"></i>
			{m.assignSupervisor()}
		</button>
	</div>

	{#if supervisorsLoading}
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
								<span class="capitalize">{sup.user.givenName}</span>
								<span class="uppercase">{sup.user.familyName}</span>
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
									title={formatNames(
										sup.user.givenName ?? undefined,
										sup.user.familyName ?? undefined,
										{ givenNameFirst: true }
									)}
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
				{#if supervisorListLoading}
					<tr>
						<td colspan="2">
							<div class="skeleton h-8 w-full"></div>
						</td>
					</tr>
				{:else if supervisorList && supervisorList.length !== 0}
					{#each [...supervisorList].sort( (a, b) => `${a.user.familyName}${a.user.givenName}`.localeCompare(`${b.user.familyName}${b.user.givenName}`) ) as supervisor (supervisor.id)}
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
								<span class="capitalize">{supervisor.user.givenName}</span>
								<span class="uppercase">{supervisor.user.familyName}</span>
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
