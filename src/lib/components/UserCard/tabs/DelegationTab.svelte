<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cache, graphql } from '$houdini';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '../../../../routes/(authenticated)/management/[conferenceId]/delegations/CommitteeAssignmentModal.svelte';
	import { delegaitonResetMutation } from '../../../../routes/(authenticated)/management/[conferenceId]/delegations/delegationResetMutation';
	import { invalidateAll } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
		conferenceState?: string | null;
	}

	let { delegationId, conferenceId, userId, conferenceState }: Props = $props();

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
					fontAwesomeIcon
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
						alpha2Code
						alpha3Code
					}
					nonStateActor {
						name
						fontAwesomeIcon
					}
				}
			}
		}
	`);

	$effect(() => {
		delegationQuery.fetch({ variables: { delegationId } });
	});

	const delegation = $derived($delegationQuery.data?.findUniqueDelegation);
	const members = $derived(
		delegation?.members.toSorted((a, b) => {
			const fullName = (x: typeof a) => x.user.family_name + x.user.given_name;
			return fullName(a).localeCompare(fullName(b));
		})
	);
	const currentMember = $derived(delegation?.members.find((member) => member.user.id === userId));

	// Mutations
	const makeHeadDelegateMutation = graphql(`
		mutation UserCardMakeHeadDelegateMutation($where: DelegationWhereUniqueInput!, $userId: ID!) {
			updateOneDelegation(where: $where, newHeadDelegateUserId: $userId) {
				id
				members {
					id
					isHeadDelegate
				}
			}
		}
	`);

	const changeDelegationSchoolMutation = graphql(`
		mutation UserCardChangeDelegationSchoolMutation($delegationId: String!, $newSchool: String!) {
			updateOneDelegation(where: { id: $delegationId }, school: $newSchool) {
				id
				school
			}
		}
	`);

	// State for modals
	type MemberType = {
		id: string;
		isHeadDelegate: boolean;
		user: { id: string; given_name: string; family_name: string };
		assignedCommittee: { id: string; abbreviation: string; name: string } | null;
	};

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
	let selectedMember = $state<MemberType | null>(null);
	let isUpdatingHeadDelegate = $state(false);

	const copyEntryCode = async () => {
		if (!delegation?.entryCode) return;
		await navigator.clipboard.writeText(delegation.entryCode);
		toast.success(m.codeCopied());
	};

	const changeSchool = async () => {
		const newSchool = prompt(m.enterNewSchoolName());
		if (!newSchool) return;
		try {
			const promise = changeDelegationSchoolMutation.mutate({ delegationId, newSchool });
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			cache.markStale();
			await invalidateAll();
		} catch (error) {
			console.error('Failed to change school name:', error);
		}
	};

	async function handleConfirmHeadDelegate() {
		if (!selectedMember || selectedMember.isHeadDelegate) return;
		isUpdatingHeadDelegate = true;
		try {
			await makeHeadDelegateMutation.mutate({
				where: { id: delegationId },
				userId: selectedMember.user.id
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

{#if $delegationQuery.fetching}
	<div class="flex flex-col gap-3">
		<div class="skeleton h-24 w-full"></div>
		<div class="skeleton h-48 w-full"></div>
	</div>
{:else if delegation}
	<div class="flex flex-col gap-6">
		<!-- Assignment Card -->
		<div class="bg-base-200 rounded-lg p-4">
			<div class="flex items-center gap-3">
				{#if delegation.assignedNation}
					<Flag alpha2Code={delegation.assignedNation.alpha2Code} size="xs" />
					<span class="text-lg font-bold">
						{getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)}
					</span>
				{:else if delegation.assignedNonStateActor}
					<Flag
						nsa
						icon={delegation.assignedNonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'}
						size="xs"
					/>
					<span class="text-lg font-bold">
						{delegation.assignedNonStateActor.name}
						({delegation.assignedNonStateActor.abbreviation})
					</span>
				{:else}
					<span class="text-base-content/60 italic">{m.noAssignment()}</span>
					{#if delegation.applied}
						<span class="badge badge-success badge-sm">{m.registrationCompleted()}</span>
					{:else}
						<span class="badge badge-warning badge-sm">{m.registrationNotCompleted()}</span>
					{/if}
				{/if}
			</div>

			<div class="mt-3 flex flex-col gap-1 text-sm">
				<div class="flex items-center gap-1">
					<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
					<span>{delegation.school ?? 'N/A'}</span>
					<button
						class="btn btn-ghost btn-xs btn-square ml-1"
						onclick={changeSchool}
						aria-label="Edit School"
					>
						<i class="fa-duotone fa-pencil"></i>
					</button>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-base-content/60">{m.entryCode()}:</span>
					<button
						class="group cursor-pointer font-mono transition-colors"
						onclick={copyEntryCode}
						title={m.copy()}
					>
						<code class="bg-base-300 rounded px-1 group-hover:bg-base-content/20">
							{delegation.entryCode}
						</code>
					</button>
				</div>
				{#if delegation.assignedNation && currentMember}
					<div class="flex items-center gap-1">
						<span class="text-base-content/60">{m.committee()}:</span>
						{#if currentMember.assignedCommittee}
							<span class="font-medium">
								{currentMember.assignedCommittee.name}
								({currentMember.assignedCommittee.abbreviation})
							</span>
						{:else}
							<span class="text-base-content/60 italic">N/A</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-2">
			<button
				class="btn btn-sm"
				onclick={async () => {
					if (!confirm(m.confirmRotateCode())) return;
					const promise = delegaitonResetMutation.mutate({
						delegationId,
						resetEntryCode: true
					});
					toast.promise(promise, genericPromiseToastMessages);
					await promise;
					cache.markStale();
					await invalidateAll();
					await delegationQuery.fetch({ variables: { delegationId } });
				}}
			>
				<i class="fa-duotone fa-arrow-rotate-left"></i>
				{m.rotateCode()}
			</button>
			{#if delegation.assignedNation}
				<button
					class="btn btn-sm {(members?.length ?? 0) === 0 && 'btn-disabled'}"
					onclick={() => (committeeAssignmentModalOpen = true)}
				>
					<i class="fa-duotone fa-grid-2"></i>
					{m.committeeAssignment()}
				</button>
			{/if}
			<button
				class="btn btn-sm"
				onclick={() => {
					selectedMember = members?.find((member) => member.isHeadDelegate) ?? null;
					headDelegateModalOpen = true;
				}}
			>
				<i class="fa-duotone fa-medal"></i>
				{m.headDelegate()}
			</button>
			{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
				<button
					class="btn btn-error btn-sm {!delegation.applied && 'btn-disabled'}"
					onclick={async () => {
						if (!confirm(m.confirmRevokeApplication())) return;
						const promise = delegaitonResetMutation.mutate({
							delegationId,
							applied: false
						});
						toast.promise(promise, genericPromiseToastMessages);
						await promise;
						cache.markStale();
						await invalidateAll();
					}}
				>
					<i class="fa-solid fa-file-slash"></i>
					{m.revokeApplication()}
				</button>
			{/if}
		</div>
	</div>

	<!-- Delegation Members -->
	<div class="mt-8">
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
					{#each members ?? [] as member (member.id)}
						<tr class={member.user.id === userId ? 'bg-base-300/50 font-bold' : ''}>
							<td>
								<span class="capitalize">{member.user.given_name}</span>
								<span class="uppercase">{member.user.family_name}</span>
								{#if member.isHeadDelegate}
									<span class="badge badge-accent badge-xs ml-1"
										><i class="fa-solid fa-medal"></i>{m.headDelegate()}</span
									>
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

	<div class="divider"></div>

	<!-- Motivation & Experience -->
	{#if delegation.motivation}
		<div>
			<h3 class="mb-1 text-lg font-bold">{m.motivation()}</h3>
			<blockquote
				class="border-base-content/20 bg-base-200 select-text rounded-r-lg border-l-4 p-3 text-sm whitespace-pre-wrap italic"
			>
				{delegation.motivation}
			</blockquote>
		</div>
	{/if}
	{#if delegation.experience}
		<div class="mt-4">
			<h3 class="mb-1 text-lg font-bold">{m.experience()}</h3>
			<blockquote
				class="border-base-content/20 bg-base-200 select-text rounded-r-lg border-l-4 p-3 text-sm whitespace-pre-wrap italic"
			>
				{delegation.experience}
			</blockquote>
		</div>
	{/if}

	<!-- Applied For Roles -->
	{#if delegation.appliedForRoles && delegation.appliedForRoles.length > 0}
		<div class="mt-4">
			<h3 class="mb-2 text-lg font-bold">{m.appliedForRoles()}</h3>
			<div class="grid grid-cols-[auto_auto_1fr] gap-2">
				{#each delegation.appliedForRoles.toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) as role, index (role.id)}
					<span class="text-sm text-base-content/60">{index + 1}.</span>
					<Flag
						alpha2Code={role.nation?.alpha2Code}
						icon={role.nonStateActor?.fontAwesomeIcon}
						nsa={!!role.nonStateActor}
						size="xs"
					/>
					{#if role.nation}
						{getFullTranslatedCountryNameFromISO3Code(role.nation.alpha3Code)}
					{:else if role.nonStateActor}
						{role.nonStateActor.name}
					{:else}
						N/A
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Head Delegate Selection Modal -->
	<div class="modal" class:modal-open={headDelegateModalOpen}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">{m.headDelegate()}</h3>
			<div class="max-h-60 overflow-y-auto">
				{#each members ?? [] as member (member.id)}
					<label class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded-md p-2">
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
							<span class="badge badge-accent">
								<i class="fa-solid fa-medal"></i>
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
					disabled={isUpdatingHeadDelegate}>{m.close()}</button
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
		nation={delegation.assignedNation}
		{conferenceId}
	/>
{/if}
