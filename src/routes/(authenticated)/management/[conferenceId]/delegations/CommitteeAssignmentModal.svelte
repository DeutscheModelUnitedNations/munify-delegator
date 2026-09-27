<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	interface Member {
		id: string;
		user: { givenName: string | null; familyName: string | null };
		assignedCommittee: { id: string } | null;
	}

	interface Props {
		open: boolean;
		members?: Member[];
		nation?: { alpha3Code: string } | null;
		conferenceId: string;
	}

	let { open = $bindable(false), members: unsortedMembers, nation, conferenceId }: Props = $props();

	let committees = $state<
		{ id: string; abbreviation: string; nations: { alpha3Code: string }[] }[]
	>([]);
	let committeesLoading = $state(false);

	$effect(() => {
		committeesLoading = true;
		void client.query
			.committees({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				abbreviation: true,
				nations: { alpha2Code: true, alpha3Code: true },
				numOfSeatsPerDelegation: true
			})
			.then((result) => {
				committees = result;
			})
			.finally(() => {
				committeesLoading = false;
			});
	});

	// Only the committees the delegation's nation actually holds a seat in.
	let filteredCommittees = $derived(
		committees.filter((committee) =>
			committee.nations.some((n) => n.alpha3Code === nation?.alpha3Code)
		)
	);

	const sortKey = (member: Member) =>
		`${member.user.familyName ?? ''}${member.user.givenName ?? ''}`;

	let members = $derived(unsortedMembers?.toSorted((a, b) => sortKey(a).localeCompare(sortKey(b))));

	let loading = $state(false);
</script>

{#snippet action()}
	<button
		class="btn btn-error"
		onclick={async () => {
			if (!members) return;
			loading = true;
			try {
				const promise = Promise.resolve(
					client.mutate.updateManyDelegationMemberCommittee({
						__args: { conferenceId, ids: members.map((member) => member.id) }
					})
				);
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
			} finally {
				loading = false;
			}
		}}
	>
		<i class="fas fa-trash-undo"></i>
		{m.reset()}
	</button>
	<button class="btn btn-primary" onclick={() => (open = false)}>
		<i class="fas fa-check"></i>
		{m.done()}
	</button>
{/snippet}

<Modal bind:open title={m.committeeAssignment()} {action} fullWidth>
	{#if committeesLoading}
		<div class="w-full items-center justify-center">
			<i class="fa-duotone fa-spin fa-spinner"></i>
		</div>
	{:else if !members || members.length === 0}
		<!-- <p>{m.noMembers()}</p> -->
	{:else if !filteredCommittees || filteredCommittees.length === 0}
		<!-- <p>{m.noCommittees()}</p> -->
	{:else}
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					{#each filteredCommittees as committee}
						<th>{committee.abbreviation}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each members as member}
					<tr>
						<td>
							{formatNames(member.user.givenName ?? undefined, member.user.familyName ?? undefined)}
						</td>
						{#each filteredCommittees as committee}
							{@const active = member.assignedCommittee?.id === committee.id}
							<td>
								<button
									class="btn btn-square btn-sm {active ? 'btn-success' : ''} {loading &&
										'disabled'}"
									onclick={async () => {
										loading = true;
										try {
											const promise = client.mutate.updateDelegationMemberCommittee({
												__args: { assignedCommitteeId: committee.id, id: member.id },
												id: true
											});
											toast.promise(promise, genericPromiseToastMessages);
											await promise;
										} finally {
											loading = false;
										}
									}}
								>
									{#if loading}
										<i class="fa-duotone fa-spin fa-spinner"></i>
									{:else if active}
										<i class="fa-duotone fa-check"></i>
									{:else}
										<i class="fa-duotone fa-plus"></i>
									{/if}
								</button>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Modal>
