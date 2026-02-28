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

	const supervisorsQuery = graphql(`
		query UserCardSupervisorsQuery($conferenceId: String!, $userId: String!) {
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				supervisors {
					id
					plansOwnAttendenceAtConference
					connectionCode
					user {
						id
						given_name
						family_name
					}
				}
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
				supervisors {
					id
					plansOwnAttendenceAtConference
					connectionCode
					user {
						id
						given_name
						family_name
					}
				}
			}
		}
	`);

	$effect(() => {
		supervisorsQuery.fetch({ variables: { conferenceId, userId } });
	});

	let supervisors = $derived.by(() => {
		const dmSupervisors = $supervisorsQuery.data?.findManyDelegationMembers?.[0]?.supervisors ?? [];
		const spSupervisors =
			$supervisorsQuery.data?.findManySingleParticipants?.[0]?.supervisors ?? [];
		const map = new Map<
			string,
			{
				id: string;
				plansOwnAttendenceAtConference: boolean;
				connectionCode: string;
				user: { id: string; given_name: string; family_name: string };
			}
		>();
		for (const s of [...dmSupervisors, ...spSupervisors]) {
			map.set(s.id, s);
		}
		return [...map.values()].sort((a, b) =>
			`${a.user.family_name}`.localeCompare(`${b.user.family_name}`)
		);
	});
</script>

{#if $supervisorsQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-16 w-full"></div>
		<div class="skeleton h-16 w-full"></div>
	</div>
{:else if supervisors.length === 0}
	<div class="alert alert-info">
		<i class="fa-duotone fa-chalkboard-user"></i>
		<span>{m.userCardNoSupervisors()}</span>
	</div>
{:else}
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th>{m.name()}</th>
					<th>{m.connectionCode()}</th>
					<th>{m.attendancePlan()}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each supervisors as sup (sup.id)}
					<tr>
						<td>
							<span class="capitalize">{sup.user.given_name}</span>
							<span class="uppercase">{sup.user.family_name}</span>
						</td>
						<td>
							<code class="bg-base-300 rounded px-1 text-xs">{sup.connectionCode}</code>
						</td>
						<td class="text-center">
							{#if sup.plansOwnAttendenceAtConference}
								<i class="fas fa-check text-success"></i>
							{:else}
								<i class="fas fa-xmark text-error"></i>
							{/if}
						</td>
						<td>
							<button
								class="btn btn-ghost btn-xs btn-square"
								onclick={() => openUserCard(sup.user.id, conferenceId)}
								title={formatNames(sup.user.given_name, sup.user.family_name, {
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
{/if}
