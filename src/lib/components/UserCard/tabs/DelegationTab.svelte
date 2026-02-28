<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	interface Props {
		delegationId: string;
		conferenceId: string;
	}

	let { delegationId, conferenceId }: Props = $props();

	const delegationQuery = graphql(`
		query UserCardDelegationQuery($delegationId: String!) {
			findUniqueDelegation(where: { id: $delegationId }) {
				id
				school
				entryCode
				applied
				motivation
				experience
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					name
					abbreviation
				}
				members {
					id
					isHeadDelegate
					user {
						id
						given_name
						family_name
					}
					assignedCommittee {
						id
						abbreviation
						name
					}
				}
				appliedForRoles {
					id
					rank
					nation {
						alpha3Code
					}
					nonStateActor {
						name
					}
				}
			}
		}
	`);

	$effect(() => {
		delegationQuery.fetch({ variables: { delegationId } });
	});

	const delegation = $derived($delegationQuery.data?.findUniqueDelegation);
</script>

{#if $delegationQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-24 w-full"></div>
		<div class="skeleton h-48 w-full"></div>
	</div>
{:else if delegation}
	<div class="flex flex-col gap-4">
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex flex-wrap items-center gap-2">
				{#if delegation.assignedNation}
					<span class="fi fi-{delegation.assignedNation.alpha2Code.toLowerCase()} text-2xl"></span>
					<span class="text-lg font-bold">{delegation.assignedNation.alpha3Code}</span>
				{:else if delegation.assignedNonStateActor}
					<span class="text-lg font-bold"
						>{delegation.assignedNonStateActor.name}
						({delegation.assignedNonStateActor.abbreviation})</span
					>
				{:else}
					<span class="text-base-content/60 italic">{m.noAssignment()}</span>
				{/if}
			</div>
			<div class="mt-2 flex flex-col gap-1 text-sm">
				{#if delegation.school}
					<div>
						<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
						{delegation.school}
					</div>
				{/if}
				<div>
					<span class="text-base-content/60">{m.entryCode()}:</span>
					<code class="bg-base-300 rounded px-1">{delegation.entryCode}</code>
				</div>
			</div>
		</div>

		<div>
			<h3 class="mb-2 text-lg font-bold">{m.delegationMembers()}</h3>
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>{m.name()}</th>
							<th>{m.committee()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each delegation.members.sort( (a, b) => `${a.user.family_name}`.localeCompare(`${b.user.family_name}`) ) as member (member.id)}
							<tr>
								<td>
									<span class="capitalize">{member.user.given_name}</span>
									<span class="uppercase">{member.user.family_name}</span>
									{#if member.isHeadDelegate}
										<span class="badge badge-primary badge-xs ml-1">{m.headDelegate()}</span>
									{/if}
								</td>
								<td>
									{member.assignedCommittee?.abbreviation ?? 'N/A'}
								</td>
								<td>
									<button
										class="btn btn-ghost btn-xs btn-square"
										onclick={() => openUserCard(member.user.id, conferenceId)}
										title={formatNames(member.user.given_name, member.user.family_name, {
											givenNameFirst: true
										})}
									>
										<i class="fa-duotone fa-id-card"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		{#if delegation.appliedForRoles && delegation.appliedForRoles.length > 0}
			<div>
				<h3 class="mb-2 text-lg font-bold">{m.appliedForRoles()}</h3>
				<ol class="list-inside list-decimal">
					{#each delegation.appliedForRoles.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) as role}
						<li>
							{#if role.nation}
								{getFullTranslatedCountryNameFromISO3Code(role.nation.alpha3Code)}
							{:else if role.nonStateActor}
								{role.nonStateActor.name}
							{:else}
								N/A
							{/if}
						</li>
					{/each}
				</ol>
			</div>
		{/if}

		{#if delegation.motivation}
			<div>
				<h3 class="mb-1 text-lg font-bold">{m.motivation()}</h3>
				<p class="text-sm whitespace-pre-wrap">{delegation.motivation}</p>
			</div>
		{/if}
		{#if delegation.experience}
			<div>
				<h3 class="mb-1 text-lg font-bold">{m.experience()}</h3>
				<p class="text-sm whitespace-pre-wrap">{delegation.experience}</p>
			</div>
		{/if}
	</div>
{/if}
