<script lang="ts">
	import { m, singleParticipants } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { SupervisorDrawerQueryVariables } from './$houdini';
	import { error } from '@sveltejs/kit';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		conferenceId: string;
		supervisorId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { supervisorId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	export const _SupervisorDrawerQueryVariables: SupervisorDrawerQueryVariables = () => {
		return {
			supervisorId: supervisorId
		};
	};

	const supervisorQuery = graphql(`
		query SupervisorDrawerQuery($supervisorId: String!) @load {
			findUniqueConferenceSupervisor(where: { id: $supervisorId }) {
				id
				plansOwnAttendenceAtConference
				user {
					id
					given_name
					family_name
				}
				supervisedDelegationMembers {
					id
					user {
						id
						given_name
						family_name
					}
					isHeadDelegate
					delegation {
						id
						entryCode
						applied
						members {
							id
						}
						school
					}
				}
				supervisedSingleParticipants {
					id
					school
					applied
					user {
						given_name
						family_name
					}
				}
			}
		}
	`);
</script>

<Drawer
	bind:open
	{onClose}
	category={m.supervisor()}
	title={formatNames(
		$supervisorQuery?.data?.findUniqueConferenceSupervisor?.user?.given_name,
		$supervisorQuery?.data?.findUniqueConferenceSupervisor?.user?.family_name,
		{ givenNameFirst: false }
	)}
	id={$supervisorQuery?.data?.findUniqueConferenceSupervisor?.id ?? 'N/A'}
	loading={$supervisorQuery.fetching}
>
	{#if $supervisorQuery?.data?.findUniqueConferenceSupervisor?.plansOwnAttendenceAtConference}
		<div class="alert alert-success">
			<i class="fas fa-location-check"></i>
			{m.supervisorPlansOwnAttendance()}
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fas fa-cloud"></i>
			{m.supervisorDoesNotPlanOwnAttendance()}
		</div>
	{/if}
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.delegations()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if $supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedDelegationMembers?.length ?? 0 > 0}
						{@const delegationIds = new Set(
							$supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedDelegationMembers.map(
								(x) => x.delegation.id
							) ?? []
						)}
						{#each delegationIds ?? [] as delegationId}
							{@const delegation =
								$supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedDelegationMembers.find(
									(x) => x.delegation.id === delegationId
								)?.delegation}
							<tr>
								<td>
									{#if delegation?.applied}
										<i class="fa-solid fa-circle-check text-success"></i>
									{:else}
										<i class="fa-solid fa-hourglass-half text-error"></i>
									{/if}
								</td>
								<td class="font-mono">
									{delegation?.entryCode}
								</td>
								<td>
									{delegation?.members.length}
								</td>
								<td>
									{delegation?.school}
								</td>
								<td>
									<a
										class="btn btn-sm"
										href={`/management/${conferenceId}/delegations?selected=${delegation?.id}`}
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
							{#each $supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedDelegationMembers?.filter((x) => x.delegation.id === delegationId) ?? [] as member}
								<tr class="text-xs">
									<td class="text-right"><i class="fa-duotone fa-arrow-turn-down-right"></i></td>
									<td colspan="3">
										{member.user.given_name}
										<span class="uppercase">{member.user.family_name}</span>
										{#if member.isHeadDelegate}
											<i class="fa-duotone fa-medal ml-2"></i>
										{/if}
									</td>
									<td>
										<a
											class="btn btn-sm"
											href={`/management/${conferenceId}/participants?selected=${member.user?.id}`}
											aria-label="Details"
										>
											<i class="fa-duotone fa-arrow-up-right-from-square"></i>
										</a>
									</td>
								</tr>
							{/each}
							<tr><td></td></tr>
						{/each}
					{:else}
						<tr>
							<td>{m.noDelegationsFound()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.singleParticipants()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if $supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedSingleParticipants?.length ?? 0 > 0}
						{@const singleParticipants =
							$supervisorQuery?.data?.findUniqueConferenceSupervisor?.supervisedSingleParticipants}
						{#each singleParticipants ?? [] as singleParticipant}
							<tr>
								<td>
									{#if singleParticipant?.applied}
										<i class="fa-solid fa-circle-check text-success"></i>
									{:else}
										<i class="fa-solid fa-hourglass-half text-error"></i>
									{/if}
								</td>
								<td class="">
									{singleParticipant.user.given_name}
									<span class="uppercase">{singleParticipant.user.family_name}</span>
								</td>
								<td>
									{singleParticipant?.school}
								</td>
								<td>
									<a
										class="btn btn-sm"
										href={`/management/${conferenceId}/singleParticipants?selected=${singleParticipant?.id}`}
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td>{m.noSingleParticipantsFound()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<a
			class="btn"
			href={`/management/${conferenceId}/participants?selected=${$supervisorQuery?.data?.findUniqueConferenceSupervisor?.userId}`}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
	</div>
</Drawer>
