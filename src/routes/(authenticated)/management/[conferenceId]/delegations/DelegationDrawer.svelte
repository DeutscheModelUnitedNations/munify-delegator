<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { cache, graphql } from '$houdini';
	import type { DelegationDrawerQueryVariables } from './$houdini';
	import { delegaitonResetMutation } from './delegationResetMutation';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from './CommitteeAssignmentModal.svelte';
	import { type PageData } from './$houdini';
	import { invalidateAll } from '$app/navigation';
	import codenmz from '$lib/services/codenamize';

	interface Props {
		conferenceId: string;
		delegationId: string;
		open?: boolean;
		onClose?: () => void;
		userData: PageData['user'];
	}
	let { delegationId, open = $bindable(false), onClose, conferenceId, userData }: Props = $props();

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
				appliedForRoles {
					nonStateActor {
						name
					}
					nation {
						alpha3Code
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

	const makeHeadDelegateAdminMutation = graphql(`
		mutation MakeHeadDelegateAdminMutation($where: DelegationWhereUniqueInput!, $userId: ID!) {
			updateOneDelegation(where: $where, newHeadDelegateUserId: $userId) {
				id
				members {
					id
					isHeadDelegate
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
	let supervisors = $derived(
		delegation?.members
			.flatMap((m) => m.supervisors)
			.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
	);

	// Define member type to properly type selectedMember
	type MemberType = {
		id: string;
		isHeadDelegate: boolean;
		user: {
			id: string;
			given_name: string;
			family_name: string;
		};
		assignedCommittee: {
			id: string;
			abbreviation: string;
			name: string;
		} | null;
	};

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
	let selectedMember = $state<MemberType | null>(null);
	let isUpdatingHeadDelegate = $state(false);

	async function handleConfirmHeadDelegate() {
		if (!selectedMember || selectedMember.isHeadDelegate) return;
		isUpdatingHeadDelegate = true;
		try {
			await makeHeadDelegateAdminMutation.mutate({
				where: { id: delegationId },
				userId: selectedMember.user?.id
			});
			cache.markStale();
			await invalidateAll();
		} catch (error) {
			console.error('Failed to update head delegate:', error);
		} finally {
			isUpdatingHeadDelegate = false;
			headDelegateModalOpen = false;
			selectedMember = null;
		}
	}
</script>

<Drawer
	bind:open
	{onClose}
	id={delegationId}
	title={codenmz(delegationId)}
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
					{#each members ?? [] as member, i (i)}
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
									href="/management/{conferenceId}/participants?selected={member.user?.id}"
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

		{#if !supervisors || supervisors.length === 0}
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
		{#if userData?.myOIDCRoles?.includes('admin')}
			<button
				class="btn"
				onclick={() => {
					selectedMember = members?.find((m) => m.isHeadDelegate) ?? null;
					headDelegateModalOpen = true;
				}}
			>
				<i class="fa-duotone fa-medal"></i>
				{m.headDelegate ? m.headDelegate() : 'Change Head Delegate'}
			</button>
		{/if}
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

<!-- Head Delegate Selection Modal -->
<div class="modal" class:modal-open={headDelegateModalOpen}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{m.headDelegate ? m.headDelegate() : m.delegationMembers()}</h3>
		<div class="max-h-60 overflow-y-auto">
			{#each members ?? [] as member, i (i)}
				<label class="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-base-200">
					<input
						type="radio"
						name="head-delegate"
						checked={selectedMember?.id === member.id}
						onclick={() => (selectedMember = member)}
						disabled={member.isHeadDelegate || isUpdatingHeadDelegate}
						class="radio"
					/>
					<span>{member.user.given_name} {member.user.family_name}</span>
					{#if member.isHeadDelegate}
						<span class="badge badge-primary">
							<i class="fas fa-medal"></i>
						</span>
					{/if}
				</label>
			{/each}
		</div>
		<div class="modal-action">
			<button
				class="btn"
				onclick={() => {
					selectedMember = null;
					headDelegateModalOpen = false;
				}}
				disabled={isUpdatingHeadDelegate}>{m.close ? m.close() : 'Cancel'}</button
			>
			<button
				class="btn btn-primary"
				onclick={handleConfirmHeadDelegate}
				disabled={!selectedMember || selectedMember.isHeadDelegate || isUpdatingHeadDelegate}
			>
				{#if isUpdatingHeadDelegate}
					<span class="loading loading-spinner"></span>
				{/if}
				{m.confirm()}
			</button>
		</div>
	</div>
</div>

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nation={delegation?.assignedNation}
	{conferenceId}
/>
