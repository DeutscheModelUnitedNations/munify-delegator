<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import codenmz from '#lib/helpers/codenamize';
	import Flag from '#lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '#lib/components/registrationAdmin/CommitteeAssignmentModal.svelte';
	import HeadDelegateModal from '#lib/components/registrationAdmin/HeadDelegateModal.svelte';
	import PersonName from '../PersonName.svelte';
	import OpenUserCardButton from '../OpenUserCardButton.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';

	/** The delegation's role, the person's committee in it, and who else is in it. */
	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
	}

	let { delegationId, conferenceId, userId }: Props = $props();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			id: true,
			applied: true,
			assignedRole: {
				id: true,
				kind: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true,
				nation: { alpha2Code: true, alpha3Code: true }
			},
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true },
				assignedCommittee: { id: true, abbreviation: true, name: true }
			}
		})
	);
	const members = $derived(
		delegation.members.toSorted((a, b) => {
			const fullName = (x: typeof a) => `${x.user.familyName ?? ''}${x.user.givenName ?? ''}`;
			return fullName(a).localeCompare(fullName(b));
		})
	);
	const currentMember = $derived(delegation.members.find((member) => member.user.id === userId));
	const role = $derived(splitRole(delegation.assignedRole));
	const nation = $derived(role.nation);
	const nonStateActor = $derived(role.nonStateActor);

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
</script>

<section class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.delegation()} {codenmz(delegationId)}</h3>

	<div class="bg-base-200 rounded-box p-4">
		<div class="flex items-center gap-3">
			{#if nation}
				<Flag alpha2Code={nation.alpha2Code} size="xs" />
				<span class="text-lg font-bold">
					{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
				</span>
			{:else if nonStateActor}
				<Flag nsa icon={nonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
				<span class="text-lg font-bold">
					{nonStateActor.name}
					({nonStateActor.abbreviation})
				</span>
			{:else}
				<NoAssignmentNotice applied={delegation.applied} />
			{/if}
		</div>
		{#if nation && currentMember}
			<div class="mt-3 flex items-center gap-1 text-sm">
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

	<div class="flex flex-wrap gap-2">
		{#if nation}
			<button
				class="btn btn-sm"
				disabled={members.length === 0}
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
	</div>

	<div>
		<h3 class="mb-2 text-lg font-bold">{m.delegationMembers()}</h3>
		<div class="overflow-x-auto">
			<table class="table-sm table">
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
							<td>{member.assignedCommittee?.abbreviation ?? 'N/A'}</td>
							<td><OpenUserCardButton user={member.user} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<HeadDelegateModal bind:open={headDelegateModalOpen} {delegationId} {members} />

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nationRoleId={nation ? delegation.assignedRole?.id : null}
	{conferenceId}
/>
