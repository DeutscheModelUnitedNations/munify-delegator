<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import PersonName from '../PersonName.svelte';
	import OpenUserCardButton from '../OpenUserCardButton.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';
	import QuotedText from '../QuotedText.svelte';
	import {
		changeDelegationSchool,
		revokeDelegationApplication,
		rotateDelegationEntryCode
	} from '$lib/api/delegationActions';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '$lib/components/registrationAdmin/CommitteeAssignmentModal.svelte';
	import HeadDelegateModal from '$lib/components/registrationAdmin/HeadDelegateModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import codenmz from '$lib/helpers/codenamize';

	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
	}

	let { delegationId, conferenceId, userId }: Props = $props();

	/** The delegation itself, plus the conference state that decides whether it can be revoked. */
	async function fetchDelegation(delegationId: string, conferenceId: string) {
		const [delegation, conference] = await Promise.all([
			client.liveQuery.delegation({
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
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { delegation, conference };
	}

	const data = $derived(await fetchDelegation(delegationId, conferenceId));
	const delegation = $derived(data.delegation);
	const conferenceState = $derived(data.conference.state);
	const members = $derived(
		delegation.members.toSorted((a, b) => {
			const fullName = (x: typeof a) => `${x.user.familyName ?? ''}${x.user.givenName ?? ''}`;
			return fullName(a).localeCompare(fullName(b));
		})
	);
	const currentMember = $derived(delegation.members.find((member) => member.user.id === userId));

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);

	const copyEntryCode = async () => {
		if (!delegation?.entryCode) return;
		await navigator.clipboard.writeText(delegation.entryCode);
		toast.success(m.codeCopied());
	};

	const appliedForRoles = $derived(
		delegation.appliedForRoles.toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
	);
</script>

{#snippet assignment()}
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
		<NoAssignmentNotice applied={delegation.applied} />
	{/if}
{/snippet}

{#snippet currentMemberCommittee(
	committee: { name: string; abbreviation: string } | null | undefined
)}
	<div class="flex items-center gap-1">
		<span class="text-base-content/60">{m.committee()}:</span>
		{#if committee}
			<span class="font-medium">
				{committee.name}
				({committee.abbreviation})
			</span>
		{:else}
			<span class="text-base-content/60 italic">N/A</span>
		{/if}
	</div>
{/snippet}

{#snippet appliedForRole(role: (typeof appliedForRoles)[number], index: number)}
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
{/snippet}

{#snippet actionButtons()}
	<div class="flex gap-2">
		<button class="btn btn-sm" onclick={() => rotateDelegationEntryCode(delegationId)}>
			<i class="fa-sharp-duotone fa-solid fa-arrow-rotate-left"></i>
			{m.rotateCode()}
		</button>
		{#if delegation.assignedNation}
			<button
				class="btn btn-sm {members.length === 0 && 'btn-disabled'}"
				onclick={() => (committeeAssignmentModalOpen = true)}
			>
				<i class="fa-sharp-duotone fa-solid fa-grid-2"></i>
				{m.committeeAssignment()}
			</button>
		{/if}
		<button class="btn btn-sm" onclick={() => (headDelegateModalOpen = true)}>
			<i class="fa-sharp-duotone fa-solid fa-medal"></i>
			{m.headDelegate()}
		</button>
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<button
				class="btn btn-error btn-sm {!delegation.applied && 'btn-disabled'}"
				onclick={() => revokeDelegationApplication(delegationId)}
			>
				<i class="fa-sharp-duotone fa-solid fa-file-slash"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<h2 class="text-2xl font-bold">{codenmz(delegationId)}</h2>

	<!-- Assignment Card -->
	<div class="bg-base-200 rounded-box p-4">
		<div class="flex items-center gap-3">
			{@render assignment()}
		</div>

		<div class="mt-3 flex flex-col gap-1 text-sm">
			<div class="flex items-center gap-1">
				<span class="text-base-content/60">{m.schoolOrInstitution()}:</span>
				<span>{delegation.school ?? 'N/A'}</span>
				<button
					class="btn btn-ghost btn-xs btn-square ml-1"
					onclick={() => changeDelegationSchool(delegationId)}
					aria-label="Edit School"
				>
					<i class="fa-sharp-duotone fa-solid fa-pencil"></i>
				</button>
			</div>
			<div class="flex items-center gap-1">
				<span class="text-base-content/60">{m.entryCode()}:</span>
				<button
					class="group cursor-pointer font-mono transition-colors"
					onclick={copyEntryCode}
					title={m.copy()}
				>
					<code class="bg-base-300 rounded-field px-1 group-hover:bg-base-content/20">
						{delegation.entryCode}
					</code>
				</button>
			</div>
			{#if delegation.assignedNation && currentMember}
				{@render currentMemberCommittee(currentMember.assignedCommittee)}
			{/if}
		</div>
	</div>

	<!-- Action Buttons -->
	{@render actionButtons()}
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
				{#each members as member (member.id)}
					<tr class={member.user.id === userId ? 'bg-base-300/50 font-bold' : ''}>
						<td>
							<PersonName
								givenName={member.user.givenName}
								familyName={member.user.familyName}
								isHeadDelegate={member.isHeadDelegate}
							/>
						</td>
						<td>
							{member.assignedCommittee?.abbreviation ?? 'N/A'}
						</td>
						<td>
							<OpenUserCardButton user={member.user} />
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
	<QuotedText title={m.motivation()} text={delegation.motivation} />
{/if}
{#if delegation.experience}
	<QuotedText class="mt-4" title={m.experience()} text={delegation.experience} />
{/if}

<!-- Applied For Roles -->
{#if appliedForRoles.length > 0}
	<div class="mt-4">
		<h3 class="mb-2 text-lg font-bold">{m.appliedForRoles()}</h3>
		<div class="grid grid-cols-[auto_auto_1fr] gap-2">
			{#each appliedForRoles as role, index (role.id)}
				{@render appliedForRole(role, index)}
			{/each}
		</div>
	</div>
{/if}

<HeadDelegateModal bind:open={headDelegateModalOpen} {delegationId} {members} />

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nation={delegation.assignedNation}
	{conferenceId}
/>
