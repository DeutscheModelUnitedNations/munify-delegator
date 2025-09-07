<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { SingleParticipantDrawerQueryVariables } from './$houdini';
	import { singleParticipantResetMutation } from './individualsResetMutation';
	import Flag from '$lib/components/Flag.svelte';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { singleParticipantId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	export const _SingleParticipantDrawerQueryVariables: SingleParticipantDrawerQueryVariables =
		() => {
			return {
				singleParticipantId: singleParticipantId
			};
		};

	const singleParticipantQuery = graphql(`
		query SingleParticipantDrawerQuery($singleParticipantId: String!) @load {
			findUniqueSingleParticipant(where: { id: $singleParticipantId }) {
				id
				applied
				school
				motivation
				experience
				user {
					id
					given_name
					family_name
				}
				appliedForRoles {
					name
					fontAwesomeIcon
				}
				assignedRole {
					id
					name
					fontAwesomeIcon
				}
				supervisors {
					id
					plansOwnAttendenceAtConference
					user {
						id
						given_name
						family_name
					}
				}
			}
		}
	`);

	let supervisors = $derived(
		$singleParticipantQuery.data?.findUniqueSingleParticipant?.supervisors ?? []
	);
</script>

<Drawer
	bind:open
	{onClose}
	title={formatNames(
		$singleParticipantQuery?.data?.findUniqueSingleParticipant?.user?.given_name,
		$singleParticipantQuery?.data?.findUniqueSingleParticipant?.user?.family_name,
		{ givenNameFirst: false }
	)}
	id={$singleParticipantQuery?.data?.findUniqueSingleParticipant?.id ?? 'N/A'}
	category={m.singleParticipant()}
	loading={$singleParticipantQuery.fetching}
>
	{#if $singleParticipantQuery.data?.findUniqueSingleParticipant?.assignedRole}
		<div class="alert">
			<Flag
				nsa
				icon={$singleParticipantQuery.data?.findUniqueSingleParticipant?.assignedRole
					.fontAwesomeIcon ?? 'fa-hand-point-up'}
			/>
			<h3 class="text-xl font-bold">
				{$singleParticipantQuery.data?.findUniqueSingleParticipant?.assignedRole.name}
			</h3>
		</div>
	{:else if $singleParticipantQuery?.data?.findUniqueSingleParticipant?.applied}
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
					<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
					<td>
						{$singleParticipantQuery?.data?.findUniqueSingleParticipant?.school}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
					<td>
						{$singleParticipantQuery?.data?.findUniqueSingleParticipant?.motivation}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
					<td>
						{$singleParticipantQuery?.data?.findUniqueSingleParticipant?.experience}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-check-to-slot text-lg"></i></td>
					<td>
						<div class="flex items-center gap-2">
							<div class="h-full rounded-md bg-base-300 px-3 py-[2px]">
								{$singleParticipantQuery?.data?.findUniqueSingleParticipant?.appliedForRoles.length}
							</div>
							<div class="flex flex-col">
								{#each $singleParticipantQuery?.data?.findUniqueSingleParticipant?.appliedForRoles ?? [] as role}
									<div>
										<i class="fa-duotone fa-{(role?.fontAwesomeIcon ?? '').replace('fa-', '')}"></i>
										{role.name}
									</div>
								{/each}
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.supervisors()}</h3>

		{#if supervisors.length === 0}
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
					{#each supervisors as supervisor, i (i)}
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
									href="/management/{conferenceId}/supervisors?selected={supervisor.id}"
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
		<a
			class="btn"
			href={`/management/${conferenceId}/participants?selected=${$singleParticipantQuery?.data?.findUniqueSingleParticipant?.user.id}`}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
		{#if $singleParticipantQuery?.data?.findUniqueSingleParticipant?.applied}
			<button
				class="btn"
				onclick={async () => {
					if (!confirm('Willst du wirklich den Bewerbungsstatus zurücksetzen?')) return;
					await singleParticipantResetMutation.mutate({
						singleParticipantId: $singleParticipantQuery!.data!.findUniqueSingleParticipant!.id!,
						applied: false
					});
				}}
			>
				{m.revokeApplication()}
				<i class="fa-duotone fa-file-slash"></i>
			</button>
		{/if}
	</div>
</Drawer>
