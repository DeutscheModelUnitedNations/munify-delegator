<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { DelegationDrawerQueryVariables } from './$houdini';
	import { error } from '@sveltejs/kit';
	import { delegaitonResetMutation } from './delegationResetMutation';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

	interface Props {
		conferenceId: string;
		delegationId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { delegationId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	export const _DelegationDrawerQueryVariables: DelegationDrawerQueryVariables = () => {
		console.log(delegationId);

		return {
			delegationId: delegationId
		};
	};

	const delegationQuery = graphql(`
		query DelegationDrawerQuery($delegationId: String!) @load {
			findUniqueDelegation(where: { id: $delegationId }) {
				applied
				entryCode
				school
				motivation
				experience
				members {
					isHeadDelegate
					user {
						id
						given_name
						family_name
					}
				}
				appliedForRoles {
					nonStateActor {
						name
					}
					nation {
						alpha3Code
					}
				}
				supervisors {
					id
					plansOwnAttendenceAtConference
					user {
						given_name
						family_name
					}
				}
			}
		}
	`);
</script>

<Drawer bind:open {onClose}>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-thin uppercase">{m.delegation()}</h3>
		<h2 class="rounded-md bg-base-300 p-2 text-3xl font-bold">
			{$delegationQuery.data?.findUniqueDelegation?.entryCode}
		</h2>
		<h3 class="text-sm font-thin">{delegationId}</h3>
	</div>

	{#if $delegationQuery.data?.findUniqueDelegation?.applied}
		<div class="alert alert-success">
			<i class="fas fa-check"></i>
			{m.registrationCompleted()}
		</div>
	{:else}
		<div class="alert alert-warning">
			<i class="fas fa-hourglass-half"></i>
			{m.registrationNotCompleted()}
		</div>
	{/if}

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-qrcode text-lg"></i></td>
					<td class="font-mono">
						{$delegationQuery.data?.findUniqueDelegation?.entryCode}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
					<td>
						{$delegationQuery.data?.findUniqueDelegation?.school}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
					<td>
						{$delegationQuery.data?.findUniqueDelegation?.motivation}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
					<td>
						{$delegationQuery.data?.findUniqueDelegation?.experience}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
					<td>
						<span class="mr-1 rounded-md bg-base-300 px-3 py-[2px]"
							>{$delegationQuery.data?.findUniqueDelegation?.appliedForRoles.length}</span
						>
						{$delegationQuery.data?.findUniqueDelegation?.appliedForRoles
							.map((x) => {
								if (x.nation) return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
								if (x.nonStateActor) return x.nonStateActor.name;
								return 'N/A';
							})
							.join(', ')}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.delegationMembers()}</h3>
		{#if $delegationQuery.data?.findUniqueDelegation?.members.length === 0}
			<div class="alert alert-warning">
				<i class="fa-solid fa-info-circle"></i>
				{m.noMembersFound()}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each $delegationQuery.data?.findUniqueDelegation?.members ?? [] as member}
						<tr>
							<td>
								{#if member.isHeadDelegate}
									<i class="fa-duotone fa-medal text-lg"></i>
								{/if}
							</td>
							<td>
								<span class="capitalize">{member.user.given_name}</span>
								<span class="uppercase">{member.user.family_name}</span>
							</td>
							<td>
								<a
									class="btn btn-sm"
									href="/management/{conferenceId}/participants?id={member.user.id}"
									aria-label="Details"
								>
									<i class="fa-duotone fa-arrow-up-right-from-square"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.supervisors()}</h3>

		{#if $delegationQuery.data?.findUniqueDelegation?.supervisors.length}
			<div class="alert alert-info">
				<i class="fa-solid fa-user-slash"></i>
				{m.noSupervisors()}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each $delegationQuery.data?.findUniqueDelegation?.supervisors ?? [] as supervisor}
						<tr>
							<td>
								{#if supervisor.plansOwnAttendenceAtConference}
									<i class="fa-duotone fa-location-check text-lg"></i>
								{:else}
									<i class="fa-duotone fa-cloud text-lg"></i>
								{/if}
							</td>
							<td>
								<span class="capitalize">{supervisor.user.given_name}</span>
								<span class="uppercase">{supervisor.user.family_name}</span>
							</td>
							<td>
								<a
									class="btn btn-sm"
									href="/management/{conferenceId}/supervisors?id={supervisor.id}"
									aria-label="Details"
								>
									<i class="fa-duotone fa-arrow-up-right-from-square"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button
			class="btn"
			onclick={async () => {
				if (!confirm(m.confirmRotateCode())) return;
				await delegaitonResetMutation.mutate({ delegationId, resetEntryCode: true });
			}}
		>
			<i class="fa-duotone fa-arrow-rotate-left"></i>
			{m.rotateCode()}
		</button>
		{#if $delegationQuery.data?.findUniqueDelegation?.applied}
			<button
				class="btn"
				onclick={async () => {
					if (!confirm(m.confirmRevokeApplication())) return;
					await delegaitonResetMutation.mutate({
						delegationId,
						applied: $delegationQuery.data?.findUniqueDelegation?.applied
					});
				}}
			>
				<i class="fa-duotone fa-file-slash"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	</div>
</Drawer>
