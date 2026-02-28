<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const studentsQuery = graphql(`
		query UserCardStudentsQuery($conferenceId: String!, $userId: String!) {
			findManyConferenceSupervisors(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				supervisedDelegationMembers {
					id
					isHeadDelegate
					user {
						id
						given_name
						family_name
					}
					delegation {
						id
						school
					}
					assignedCommittee {
						id
						abbreviation
					}
				}
				supervisedSingleParticipants {
					id
					user {
						id
						given_name
						family_name
					}
					school
					assignedRole {
						id
						name
					}
				}
			}
		}
	`);

	$effect(() => {
		studentsQuery.fetch({ variables: { conferenceId, userId } });
	});

	const supervisor = $derived($studentsQuery.data?.findManyConferenceSupervisors?.[0]);
	const delegationMembers = $derived(supervisor?.supervisedDelegationMembers ?? []);
	const singleParticipants = $derived(supervisor?.supervisedSingleParticipants ?? []);
</script>

{#if $studentsQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-24 w-full"></div>
		<div class="skeleton h-24 w-full"></div>
	</div>
{:else if delegationMembers.length === 0 && singleParticipants.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-graduation-cap"></i>
		<span>{m.userCardNoStudents()}</span>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#if delegationMembers.length > 0}
			<div>
				<h3 class="mb-2 text-lg font-bold">
					{m.delegationMembers()}
				</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>{m.name()}</th>
								<th>{m.delegation()}</th>
								<th>{m.committee()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each delegationMembers.sort( (a, b) => `${a.user.family_name}`.localeCompare(`${b.user.family_name}`) ) as member (member.id)}
								<tr>
									<td>
										<span class="capitalize">{member.user.given_name}</span>
										<span class="uppercase">{member.user.family_name}</span>
										{#if member.isHeadDelegate}
											<span class="badge badge-primary badge-xs ml-1">{m.headDelegate()}</span>
										{/if}
									</td>
									<td>{member.delegation?.school ?? 'N/A'}</td>
									<td>{member.assignedCommittee?.abbreviation ?? 'N/A'}</td>
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
		{/if}

		{#if singleParticipants.length > 0}
			<div>
				<h3 class="mb-2 text-lg font-bold">
					{m.adminSingleParticipants()}
				</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>{m.name()}</th>
								<th>{m.schoolOrInstitution()}</th>
								<th>{m.assignedRole()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each singleParticipants.sort( (a, b) => `${a.user.family_name}`.localeCompare(`${b.user.family_name}`) ) as participant (participant.id)}
								<tr>
									<td>
										<span class="capitalize">{participant.user.given_name}</span>
										<span class="uppercase">{participant.user.family_name}</span>
									</td>
									<td>{participant.school ?? 'N/A'}</td>
									<td>{participant.assignedRole?.name ?? 'N/A'}</td>
									<td>
										<button
											class="btn btn-ghost btn-xs btn-square"
											onclick={() => openUserCard(participant.user.id, conferenceId)}
											title={formatNames(
												participant.user.given_name,
												participant.user.family_name,
												{ givenNameFirst: true }
											)}
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
		{/if}
	</div>
{/if}
