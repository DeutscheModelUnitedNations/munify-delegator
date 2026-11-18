<!--
	@component
	The functions of a team member, next to their team role: being a trusted person of the
	conference, and which committees they chair or advise. Whoever holds a function answers its
	inbox in the chats. A switch per function; each saves on its own.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import FunctionToggle from './FunctionToggle.svelte';

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
	{@const heldId = ({ kind, committeeId }: { kind: string; committeeId: string | null }) =>
		functions.find(
			(candidate) => candidate.kind === kind && (candidate.committeeId ?? null) === committeeId
		)?.id}
	<label
		class="bg-base-200 mb-4 flex cursor-pointer items-start gap-3 rounded-box p-3"
		data-testid="team-function-trusted"
	>
		<FunctionToggle
			teamMemberId={memberId}
			kind="TRUSTED_PERSON"
			heldId={heldId({ kind: 'TRUSTED_PERSON', committeeId: null })}
			label={m.chatInboxTrustedPerson()}
		/>
		<span class="flex flex-col gap-0.5">
			<span class="font-semibold">{m.chatInboxTrustedPerson()}</span>
			<span class="text-base-content/70 text-sm">{m.teamFunctionTrustedPersonExplanation()}</span>
		</span>
	</label>

	<h3 class="mb-1 font-semibold">{m.teamFunctionsCommittees()}</h3>
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
							<td class="text-center">
								<FunctionToggle
									teamMemberId={memberId}
									{kind}
									committeeId={committee.id}
									heldId={heldId({ kind, committeeId: committee.id })}
									label={`${kind === 'CHAIR' ? m.chatInboxChairs() : m.chatInboxConsultants()} · ${committee.abbreviation}`}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
{/snippet}
