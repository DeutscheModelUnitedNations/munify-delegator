<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	interface Props {
		open: boolean;
		userId: string;
		conferenceId: string;
	}

	let { open = $bindable(false), userId, conferenceId }: Props = $props();

	// Every supervisor of the conference to pick from, only fetched while the picker is open.
	const supervisors = $derived(
		open
			? await client.liveQuery.conferenceSupervisors({
					__args: { where: { conferenceId: { eq: conferenceId } } },
					id: true,
					connectionCode: true,
					user: { id: true, givenName: true, familyName: true }
				})
			: []
	);

	const sortedSupervisors = $derived(
		supervisors.toSorted((a, b) =>
			`${a.user.familyName}${a.user.givenName}`.localeCompare(
				`${b.user.familyName}${b.user.givenName}`
			)
		)
	);

	const assignSupervisor = async (connectionCode: string) => {
		const promise = client.mutate.connectToConferenceSupervisor({
			__args: { conferenceId, userId, connectionCode },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		open = false;
	};
</script>

<Modal bind:open title={m.assignSupervisor()}>
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th></th>
					<th>{m.name()}</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedSupervisors as supervisor (supervisor.id)}
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
				{:else}
					<tr>
						<td colspan="2" class="text-center">
							{m.noSingleParticipantsFound()}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Modal>
