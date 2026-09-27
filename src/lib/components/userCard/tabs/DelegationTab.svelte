<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '../../../../routes/(authenticated)/management/[conferenceId]/delegations/CommitteeAssignmentModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
		conferenceState?: string | null;
	}

	let { delegationId, conferenceId, userId, conferenceState }: Props = $props();

	function fetchDelegation() {
		return client.query.delegation({
			__args: { id: delegationId },
			id: true,
			school: true,
			entryCode: true,
			applied: true,
			motivation: true,
			experience: true,
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: {
				id: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true
			},
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true },
				assignedCommittee: { id: true, abbreviation: true, name: true }
			},
			appliedForRoles: {
				id: true,
				rank: true,
				nation: { alpha2Code: true, alpha3Code: true },
				nonStateActor: { name: true, fontAwesomeIcon: true }
			}
		});
	}

	let loadedDelegation = $state<Awaited<ReturnType<typeof fetchDelegation>>>();
	let delegationLoading = $state(false);

	async function loadDelegation() {
		delegationLoading = true;
		try {
			loadedDelegation = await fetchDelegation();
		} finally {
			delegationLoading = false;
		}
	}

	$effect(() => {
		void loadDelegation();
	});

	const delegation = $derived(loadedDelegation);
	const members = $derived(
		delegation?.members.toSorted((a, b) => {
			const fullName = (x: typeof a) => `${x.user.familyName ?? ''}${x.user.givenName ?? ''}`;
			return fullName(a).localeCompare(fullName(b));
		})
	);
	const currentMember = $derived(delegation?.members.find((member) => member.user.id === userId));

	// State for modals
	type MemberType = {
		id: string;
		isHeadDelegate: boolean;
		user: { id: string; givenName: string | null; familyName: string | null };
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
			const promise = client.mutate.updateDelegation({
				__args: { id: delegationId, school: newSchool },
				id: true,
				school: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await loadDelegation();
		} catch (error) {
			console.error('Failed to change school name:', error);
		}
	};

	async function handleConfirmHeadDelegate() {
		if (!selectedMember || selectedMember.isHeadDelegate) return;
		isUpdatingHeadDelegate = true;
		try {
			await client.mutate.updateDelegation({
				__args: { id: delegationId, newHeadDelegateUserId: selectedMember.user.id },
				id: true,
				members: { id: true, isHeadDelegate: true }
			});
			await loadDelegation();
		} catch (error) {
			console.error('Failed to update head delegate:', error);
		} finally {
			isUpdatingHeadDelegate = false;
			headDelegateModalOpen = false;
			selectedMember = null;
		}
	}
</script>

{#if delegationLoading}
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
					const promise = client.mutate.updateDelegation({
						__args: { id: delegationId, resetEntryCode: true },
						id: true,
						entryCode: true
					});
					toast.promise(promise, genericPromiseToastMessages);
					await promise;
					await loadDelegation();
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
						const promise = client.mutate.updateDelegation({
							__args: { id: delegationId, applied: false },
							id: true,
							applied: true
						});
						toast.promise(promise, genericPromiseToastMessages);
						await promise;
						await loadDelegation();
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
								<span class="capitalize">{member.user.givenName}</span>
								<span class="uppercase">{member.user.familyName}</span>
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
									title={formatNames(
										member.user.givenName ?? undefined,
										member.user.familyName ?? undefined,
										{
											givenNameFirst: true
										}
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
						<span>{member.user.givenName} {member.user.familyName}</span>
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
