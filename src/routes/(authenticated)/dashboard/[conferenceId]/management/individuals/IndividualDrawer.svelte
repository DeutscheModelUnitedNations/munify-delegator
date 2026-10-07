<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import Flag from '$lib/components/Flag.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import ApplicationStatusAlert from '$lib/components/registrationAdmin/ApplicationStatusAlert.svelte';
	import DetailsTable from '$lib/components/registrationAdmin/DetailsTable.svelte';
	import DetailRow from '$lib/components/registrationAdmin/DetailRow.svelte';
	import SupervisorLinkTable from '$lib/components/registrationAdmin/SupervisorLinkTable.svelte';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { singleParticipantId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	const singleParticipant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			applied: true,
			school: true,
			motivation: true,
			experience: true,
			user: person,
			appliedForRoles: { id: true, name: true, fontAwesomeIcon: true },
			assignedRole: { id: true, name: true, fontAwesomeIcon: true },
			supervisors: {
				id: true,
				plansOwnAttendenceAtConference: true,
				user: { givenName: true, familyName: true }
			}
		})
	);

	const revokeApplication = async () => {
		if (!confirm(m.confirmRevokeApplication())) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipant.id, applied: false },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<Drawer
	bind:open
	{onClose}
	title={formatNames(
		singleParticipant.user.givenName ?? undefined,
		singleParticipant.user.familyName ?? undefined,
		{ givenNameFirst: false }
	)}
	id={singleParticipant.id}
	category={m.singleParticipant()}
	loading={false}
>
	{#if singleParticipant.assignedRole}
		<div class="alert">
			<Flag nsa icon={singleParticipant.assignedRole.fontAwesomeIcon ?? 'fa-hand-point-up'} />
			<h3 class="text-xl font-bold">
				{singleParticipant.assignedRole.name}
			</h3>
		</div>
	{:else}
		<ApplicationStatusAlert applied={singleParticipant.applied} />
	{/if}

	<DetailsTable>
		<DetailRow icon="fa-school">{singleParticipant.school}</DetailRow>
		<DetailRow icon="fa-fire-flame-curved">{singleParticipant.motivation}</DetailRow>
		<DetailRow icon="fa-compass">{singleParticipant.experience}</DetailRow>
		<DetailRow icon="fa-check-to-slot">
			<div class="flex items-center gap-2">
				<div class="bg-base-300 h-full rounded-md px-3 py-[2px]">
					{singleParticipant.appliedForRoles.length}
				</div>
				<div class="flex flex-col">
					{#each singleParticipant.appliedForRoles as role (role.id)}
						<div>
							<i class="fa-duotone fa-{(role.fontAwesomeIcon ?? '').replace('fa-', '')}"></i>
							{role.name}
						</div>
					{/each}
				</div>
			</div>
		</DetailRow>
	</DetailsTable>

	<SupervisorLinkTable {conferenceId} supervisors={singleParticipant.supervisors} />

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button class="btn" onclick={() => openUserCard(singleParticipant.user.id)}>
			{m.adminUserCard()}
			<i class="fa-duotone fa-id-card"></i>
		</button>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<button
			class="btn {!singleParticipant.applied && 'btn-disabled'} btn-error"
			onclick={revokeApplication}
		>
			{m.revokeApplication()}
			<i class="fa-solid fa-file-slash"></i>
		</button>
	</div>
</Drawer>
