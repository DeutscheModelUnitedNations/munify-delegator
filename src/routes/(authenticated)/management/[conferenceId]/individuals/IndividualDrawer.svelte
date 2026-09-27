<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import Flag from '$lib/components/Flag.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { invalidateAll } from '$app/navigation';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { singleParticipantId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	function fetchSingleParticipant(id: string) {
		return client.query.singleParticipant({
			__args: { id },
			id: true,
			applied: true,
			school: true,
			motivation: true,
			experience: true,
			user: person,
			appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
			assignedRole: { id: true, name: true, fontAwesomeIcon: true },
			supervisors: { id: true, plansOwnAttendenceAtConference: true, user: person }
		});
	}

	let singleParticipant = $state<Awaited<ReturnType<typeof fetchSingleParticipant>>>();
	let loading = $state(false);

	async function loadSingleParticipant(id: string) {
		loading = true;
		try {
			singleParticipant = await fetchSingleParticipant(id);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void loadSingleParticipant(singleParticipantId);
	});

	let supervisors = $derived(singleParticipant?.supervisors ?? []);

	const revokeApplication = async () => {
		if (!singleParticipant) return;
		if (!confirm(m.confirmRevokeApplication())) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipant.id, applied: false },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await loadSingleParticipant(singleParticipant.id);
		await invalidateAll();
	};
</script>

<Drawer
	bind:open
	{onClose}
	title={formatNames(
		singleParticipant?.user?.givenName ?? undefined,
		singleParticipant?.user?.familyName ?? undefined,
		{ givenNameFirst: false }
	)}
	id={singleParticipant?.id ?? 'N/A'}
	category={m.singleParticipant()}
	{loading}
>
	{#if singleParticipant?.assignedRole}
		<div class="alert">
			<Flag nsa icon={singleParticipant?.assignedRole.fontAwesomeIcon ?? 'fa-hand-point-up'} />
			<h3 class="text-xl font-bold">
				{singleParticipant?.assignedRole.name}
			</h3>
		</div>
	{:else if singleParticipant?.applied}
		<div class="alert alert-success">
			<i class="fas fa-check"></i>
			{m.registrationCompleted()}
		</div>
	{:else}
		<div class="alert alert-warning">
			<i class="fas fa-hourglass-half"></i>
			{m.registrationNotCompleted()}
		</div>
	{/if}

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
					<td>
						{singleParticipant?.school}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
					<td>
						{singleParticipant?.motivation}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
					<td>
						{singleParticipant?.experience}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-check-to-slot text-lg"></i></td>
					<td>
						<div class="flex items-center gap-2">
							<div class="bg-base-300 h-full rounded-md px-3 py-[2px]">
								{singleParticipant?.appliedForRoles.length}
							</div>
							<div class="flex flex-col">
								{#each singleParticipant?.appliedForRoles ?? [] as role (role.id)}
									<div>
										<i class="fa-duotone fa-{(role?.fontAwesomeIcon ?? '').replace('fa-', '')}"></i>
										{role.name}
									</div>
								{/each}
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.supervisors()}</h3>

		{#if supervisors.length === 0}
			<div class="alert alert-info">
				<i class="fa-solid fa-user-slash"></i>
				{m.noSupervisors()}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each supervisors as supervisor, i (i)}
						<tr>
							<td>
								{#if supervisor.plansOwnAttendenceAtConference}
									<i class="fa-duotone fa-location-check text-lg"></i>
								{:else}
									<i class="fa-duotone fa-cloud text-lg"></i>
								{/if}
							</td>
							<td>
								<span class="capitalize">{supervisor.user.givenName}</span>
								<span class="uppercase">{supervisor.user.familyName}</span>
							</td>
							<td>
								<a
									class="btn btn-sm"
									href="/management/{conferenceId}/supervisors?selected={supervisor.id}"
									aria-label="Details"
								>
									<i class="fa-duotone fa-arrow-up-right-from-square"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button
			class="btn"
			onclick={() => {
				const userId = singleParticipant?.user.id;
				if (userId) openUserCard(userId, conferenceId);
			}}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-id-card"></i>
		</button>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<button
			class="btn {!singleParticipant?.applied && 'btn-disabled'} btn-error"
			onclick={revokeApplication}
		>
			{m.revokeApplication()}
			<i class="fa-solid fa-file-slash"></i>
		</button>
	</div>
</Drawer>
