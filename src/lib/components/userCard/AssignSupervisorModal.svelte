<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { allOf, personContains, searchWords } from '$lib/components/tanStackTable/serverQuery';

	const SUPERVISOR_LIMIT = 20;

	interface Props {
		open: boolean;
		userId: string;
		conferenceId: string;
	}

	let { open = $bindable(false), userId, conferenceId }: Props = $props();

	// The picker searches in the backend and shows the first matches, only fetched while it is open.
	let typed = $state('');
	let search = $state('');
	$effect(() => {
		const next = typed;
		const timer = setTimeout(() => (search = next), 250);
		return () => clearTimeout(timer);
	});

	const supervisors = $derived(
		open
			? await client.liveQuery.conferenceSupervisors({
					__args: {
						where: {
							conferenceId: { eq: conferenceId },
							...allOf(searchWords(search).map((word) => ({ user: personContains(word) })))
						},
						limit: SUPERVISOR_LIMIT,
						orderBy: { createdAt: 'desc', id: 'asc' }
					},
					id: true,
					connectionCode: true,
					user: { id: true, givenName: true, familyName: true }
				})
			: []
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
	<label class="input input-bordered mb-2 flex w-full items-center gap-2">
		<input type="text" class="grow" bind:value={typed} placeholder={m.search()} />
		<i class="fa-duotone fa-magnifying-glass"></i>
	</label>
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th></th>
					<th>{m.name()}</th>
				</tr>
			</thead>
			<tbody>
				{#each supervisors as supervisor (supervisor.id)}
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
