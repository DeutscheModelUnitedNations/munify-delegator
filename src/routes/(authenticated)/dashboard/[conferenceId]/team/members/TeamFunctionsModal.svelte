<!--
	@component
	Which committees a team member chairs or advises. Whoever holds a function answers that
	committee's inbox of it in the chats, next to their team role. One row per committee, a switch
	per function; each switch saves on its own.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';

	interface Props {
		open: boolean;
		conferenceId: string;
		member: { id: string; name: string };
	}

	let { open = $bindable(), conferenceId, member }: Props = $props();
</script>

<Modal bind:open title={m.teamFunctionsOf({ name: member.name })}>
	<p class="text-base-content/70 mb-4 text-sm">{m.teamFunctionsExplanation()}</p>
	<svelte:boundary>
		{@render matrix()}
		{#snippet pending()}
			<div class="flex justify-center py-8">
				<span class="loading loading-spinner" aria-label={m.genericToastLoading()}></span>
			</div>
		{/snippet}
	</svelte:boundary>
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>

{#snippet matrix()}
	{@const memberId = member.id}
	{@const [committees, functions] = await Promise.all([
		client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } }, orderBy: { abbreviation: 'asc' } },
			abbreviation: true,
			name: true
		}),
		client.liveQuery.teamFunctions({
			__args: { where: { teamMemberId: { eq: memberId } } },
			kind: true,
			committeeId: true
		})
	])}
	{#if committees.length === 0}
		<p class="text-base-content/60">{m.teamFunctionsNoCommittees()}</p>
	{:else}
		<table class="table table-sm" data-testid="team-functions">
			<thead>
				<tr>
					<th>{m.committee()}</th>
					<th class="text-center">{m.chatInboxChairs()}</th>
					<th class="text-center">{m.chatInboxConsultants()}</th>
				</tr>
			</thead>
			<tbody>
				{#each committees as committee (committee.id)}
					<tr>
						<th scope="row" class="font-normal">
							<span class="font-semibold">{committee.abbreviation}</span>
							<span class="text-base-content/60 ml-1 text-xs">{committee.name}</span>
						</th>
						{#each ['CHAIR', 'CONSULTANT'] as const as kind (kind)}
							{@const held = functions.find(
								(candidate) => candidate.committeeId === committee.id && candidate.kind === kind
							)}
							<td class="text-center">
								<input
									type="checkbox"
									class="toggle toggle-primary toggle-sm"
									checked={!!held}
									aria-label={`${kind === 'CHAIR' ? m.chatInboxChairs() : m.chatInboxConsultants()} · ${committee.abbreviation}`}
									onchange={async (event) => {
										const input = event.currentTarget;
										try {
											if (held) {
												await client.mutate.removeTeamFunction({ __args: { id: held.id } });
											} else {
												await client.mutate.giveTeamFunction({
													__args: { teamMemberId: memberId, committeeId: committee.id, kind },
													id: true
												});
											}
										} catch {
											input.checked = !!held;
											toast.error(m.chatSaveFailed());
										}
									}}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
{/snippet}
