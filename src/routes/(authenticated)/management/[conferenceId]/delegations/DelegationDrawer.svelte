<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { DelegationDrawerQueryVariables } from './$houdini';
	import { delegaitonResetMutation } from './delegationResetMutation';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from './CommitteeAssignmentModal.svelte';

	interface Props {
		conferenceId: string;
		delegationId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { delegationId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	export const _DelegationDrawerQueryVariables: DelegationDrawerQueryVariables = () => {
		return {
			delegationId,
			conferenceId
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
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					abbreviation
					name
					fontAwesomeIcon
				}
			}
		}
	`);

	let delegation = $derived($delegationQuery.data?.findUniqueDelegation);
	let members = $derived(
		delegation?.members.sort((a, b) => {
			const bothNames = (x: typeof a) => x.user.family_name + x.user.given_name;
			return bothNames(a).localeCompare(bothNames(b));
		})
	);

	let committeeAssignmentModalOpen = $state(false);
</script>

<Drawer
	bind:open
	{onClose}
	id={delegationId}
	title={delegation?.entryCode ?? 'XXXXXX'}
	category={m.delegation()}
	loading={$delegationQuery.fetching}
>
	{#if delegation?.assignedNation}
		<div class="alert">
			<Flag alpha2Code={delegation?.assignedNation.alpha2Code} />
			<h3 class="text-xl font-bold">
				{getFullTranslatedCountryNameFromISO3Code(delegation?.assignedNation.alpha3Code)}
			</h3>
		</div>
	{:else if delegation?.assignedNonStateActor}
		<div class="alert">
			<Flag nsa icon={delegation?.assignedNonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'} />
			{delegation?.assignedNonStateActor.name}
		</div>
	{:else if delegation?.applied}
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
						{delegation?.entryCode}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
					<td>
						{delegation?.school}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
					<td>
						{delegation?.motivation}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
					<td>
						{delegation?.experience}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
					<td>
						<span class="mr-1 rounded-md bg-base-300 px-3 py-[2px]"
							>{delegation?.appliedForRoles.length}</span
						>
						{delegation?.appliedForRoles
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
		{#if members?.length === 0}
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
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each members ?? [] as member}
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
								{#if member.assignedCommittee}
									<span class="text-xs">{member.assignedCommittee.abbreviation}</span>
								{:else}
									<i class="fa-duotone fa-dash"></i>
								{/if}
							</td>
							<td>
								<a
									class="btn btn-sm"
									href="/management/{conferenceId}/participants?filter={member.user.id}"
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

		{#if !delegation?.supervisors || delegation?.supervisors.length === 0}
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
					{#each delegation?.supervisors ?? [] as supervisor}
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
									href="/management/{conferenceId}/supervisors?filter={supervisor.id}"
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
		<button
			class="btn {members?.length === 0 && 'disabled'}"
			onclick={() => (committeeAssignmentModalOpen = true)}
		>
			<i class="fa-duotone fa-grid-2"></i>
			{m.committeeAssignment()}
		</button>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<button
			class="btn {!delegation?.applied && 'btn-disabled'} btn-error"
			onclick={async () => {
				if (!confirm(m.confirmRevokeApplication())) return;
				await delegaitonResetMutation.mutate({
					delegationId,
					applied: delegation?.applied
				});
			}}
		>
			<i class="fas fa-file-slash"></i>
			{m.revokeApplication()}
		</button>
	</div>
</Drawer>

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nation={delegation?.assignedNation}
	{conferenceId}
/>
