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

	// Only fetched while the modal is open: a closed modal shows nothing.
	const committees = $derived(
		open
			? await client.liveQuery.committees({
					__args: { where: { conferenceId: { eq: conferenceId } } },
					id: true,
					abbreviation: true,
					nations: { alpha3Code: true }
				})
			: []
	);

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

	/** Runs one committee mutation, with its toast, and keeps every button disabled meanwhile. */
	async function runAssignment(promise: Promise<unknown>) {
		loading = true;
		try {
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		} finally {
			loading = false;
		}
	}

	function resetAssignments() {
		if (!members) return;
		return runAssignment(
			Promise.resolve(
				client.mutate.updateManyDelegationMemberCommittee({
					__args: { conferenceId, ids: members.map((member) => member.id) }
				})
			)
		);
	}

	function assign(memberId: string, committeeId: string) {
		return runAssignment(
			Promise.resolve(
				client.mutate.updateDelegationMemberCommittee({
					__args: { assignedCommitteeId: committeeId, id: memberId },
					id: true
				})
			)
		);
	}

	const hasTable = $derived(!!members?.length && filteredCommittees.length > 0);
</script>

{#snippet action()}
	<button class="btn btn-error" onclick={resetAssignments}>
		<i class="fas fa-trash-undo"></i>
		{m.reset()}
	</button>
	<button class="btn btn-primary" onclick={() => (open = false)}>
		<i class="fas fa-check"></i>
		{m.done()}
	</button>
{/snippet}

{#snippet assignButton(member: Member, committeeId: string)}
	{@const active = member.assignedCommittee?.id === committeeId}
	<button
		class="btn btn-square btn-sm {active ? 'btn-success' : ''} {loading && 'disabled'}"
		onclick={() => assign(member.id, committeeId)}
	>
		{#if loading}
			<i class="fa-sharp-duotone fa-solid fa-spin fa-spinner"></i>
		{:else}
			<i class="fa-sharp-duotone fa-solid {active ? 'fa-check' : 'fa-plus'}"></i>
		{/if}
	</button>
{/snippet}

<Modal bind:open title={m.committeeAssignment()} {action} fullWidth>
	{#if hasTable && members}
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					{#each filteredCommittees as committee (committee.id)}
						<th>{committee.abbreviation}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each members as member (member.id)}
					<tr>
						<td>
							{formatNames(member.user.givenName ?? undefined, member.user.familyName ?? undefined)}
						</td>
						{#each filteredCommittees as committee (committee.id)}
							<td>{@render assignButton(member, committee.id)}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Modal>
