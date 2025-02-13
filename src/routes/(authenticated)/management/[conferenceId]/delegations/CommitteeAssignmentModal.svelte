<script lang="ts">
	import type { DelegationDrawerQuery$result } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		members?: NonNullable<DelegationDrawerQuery$result['findUniqueDelegation']>['members'];
		committees?: NonNullable<DelegationDrawerQuery$result['findManyCommittees']>;
	}

	let { open = $bindable(false), members, committees }: Props = $props();
</script>

<Modal bind:open title={m.committeeAssignment()}>
	{#if !members || members.length === 0}
		<!-- <p>{m.noMembers()}</p> -->
	{:else if !committees || committees.length === 0}
		<!-- <p>{m.noCommittees()}</p> -->
	{:else}
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					{#each committees as committee}
						<th>{committee.abbreviation}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each members as member}
					<tr>
						<td>{member.user.given_name} {member.user.family_name}</td>
						<td>{member.isHeadDelegate ? m.headDelegate() : ''}</td>
						<td>{member.assignedCommittee.name}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Modal>
