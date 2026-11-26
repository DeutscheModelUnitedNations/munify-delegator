<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import PersonNameButton from '../PersonNameButton.svelte';
	import Empty from '../ui/Empty.svelte';
	import Section from '../ui/Section.svelte';
	import Row from '../ui/Row.svelte';
	import { openUserCard } from '../userCardState.svelte';
	import { CLICKABLE_ROW, rowClick } from '#lib/helpers/rowClick';
	import SupervisorRegistration from './SupervisorRegistration.svelte';
	import { removeSupervision } from './removeSupervision';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { delegationSchoolsLabel } from '#lib/helpers/delegationSchools';
	import codenmz from '#lib/helpers/codenamize';
	import Flag from '#lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { splitRole } from '#lib/helpers/conferenceRole';

	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const studentSelection = { id: true, givenName: true, familyName: true } as const;

	// The connection code is the registration's and the school the person's; this is whom they look
	// after.
	const conferenceSupervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			id: true,
			plansOwnAttendenceAtConference: true,
			user: studentSelection,
			supervisedDelegationMembers: {
				id: true,
				isHeadDelegate: true,
				user: studentSelection,
				school: { name: true },
				delegation: {
					id: true,
					entryCode: true,
					applied: true,
					members: { id: true },
					assignedRole: {
						kind: true,
						name: true,
						icon: true,
						nation: { alpha2Code: true, alpha3Code: true }
					}
				},
				assignedCommittee: { id: true, abbreviation: true }
			},
			supervisedSingleParticipants: {
				id: true,
				applied: true,
				user: studentSelection,
				school: { name: true },
				assignedRole: { id: true, name: true }
			}
		})
	);
	const delegationMembers = $derived(conferenceSupervisor.supervisedDelegationMembers);
	const singleParticipants = $derived(conferenceSupervisor.supervisedSingleParticipants);

	// Group delegation members by their delegation
	const groupedDelegations = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- temporary grouping, not reactive state
		const map = new Map<
			string,
			{
				delegation: (typeof delegationMembers)[number]['delegation'];
				members: typeof delegationMembers;
			}
		>();
		for (const member of delegationMembers) {
			const existing = map.get(member.delegation.id);
			if (existing) {
				existing.members.push(member);
			} else {
				map.set(member.delegation.id, {
					delegation: member.delegation,
					members: [member]
				});
			}
		}
		// Sort members within each group by family name
		for (const group of map.values()) {
			group.members.sort((a, b) =>
				(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
			);
		}
		return [...map.values()];
	});

	const changeAttendance = async (plansOwnAttendenceAtConference: boolean) => {
		const promise = client.mutate.updateConferenceSupervisor({
			__args: { id: conferenceSupervisor.id, plansOwnAttendenceAtConference },
			id: true,
			plansOwnAttendenceAtConference: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const sortedSingleParticipants = $derived(
		singleParticipants.toSorted((a, b) =>
			(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
		)
	);

	type Group = (typeof groupedDelegations)[number];
</script>

{#snippet appliedIcon(applied: boolean)}
	{#if applied}
		<i aria-hidden="true" class="ph-duotone ph-check-circle text-success"></i>
	{:else}
		<i aria-hidden="true" class="ph-duotone ph-hourglass-medium text-error"></i>
	{/if}
{/snippet}

{#snippet delegationAssignment(delegation: Group['delegation'], members: Group['members'])}
	{@const schools = delegationSchoolsLabel(members)}
	{@const { nation, nonStateActor } = splitRole(delegation.assignedRole)}
	{#if nation}
		<Flag alpha2Code={nation.alpha2Code} size="xs" />
	{:else if nonStateActor}
		<Flag nsa icon={nonStateActor.icon ?? 'hand-pointing'} size="xs" />
	{/if}
	<div class="flex flex-col">
		<div>
			<span class="font-bold">{codenmz(delegation.id)}</span>
			{#if nation}
				<span class="text-base-content/60 text-xs"
					>({getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)})</span
				>
			{:else if nonStateActor}
				<span class="text-base-content/60 text-xs">({nonStateActor.name})</span>
			{/if}
		</div>
		{#if schools}
			<span class="text-base-content/60 text-xs">{schools}</span>
		{/if}
	</div>
{/snippet}

{#snippet delegationGroupRows(group: Group)}
	<!-- Delegation header row -->
	<tr>
		<td>{@render appliedIcon(group.delegation.applied)}</td>
		<td>
			<div class="flex items-center gap-2">
				{@render delegationAssignment(group.delegation, group.members)}
			</div>
		</td>
		<td>
			<code class="bg-base-300 rounded-field px-1 text-xs font-mono"
				>{group.delegation.entryCode}</code
			>
		</td>
		<td>
			<span class="badge badge-sm"
				>{group.delegation.members.length}
				{m.delegationMembers()}</span
			>
		</td>
		<td></td>
	</tr>
	<!-- Nested member rows -->
	{#each group.members as member (member.id)}
		<tr class="{CLICKABLE_ROW} text-sm" onclick={rowClick(() => openUserCard(member.user.id))}>
			<td class="text-right">
				<i aria-hidden="true" class="ph-duotone ph-arrow-elbow-down-right text-base-content/40"></i>
			</td>
			<td colspan="2">
				<PersonNameButton user={member.user} isHeadDelegate={member.isHeadDelegate} />
			</td>
			<td>
				{member.assignedCommittee?.abbreviation ?? ''}
			</td>
			<td>{@render studentActions(member.user)}</td>
		</tr>
	{/each}
{/snippet}

{#snippet studentActions(student: { id: string; givenName: string; familyName: string })}
	<div class="flex justify-end gap-1">
		<button
			class="btn btn-ghost btn-xs btn-square text-error"
			onclick={() => removeSupervision({ supervisor: conferenceSupervisor, student })}
			aria-label={m.removeSupervision()}
			title={m.removeSupervision()}
		>
			<i aria-hidden="true" class="ph-duotone ph-link-break"></i>
		</button>
	</div>
{/snippet}

{#snippet singleParticipantsTable()}
	<table class="table table-sm">
		<thead>
			<tr>
				<th></th>
				<th>{m.name()}</th>
				<th>{m.schoolOrInstitution()}</th>
				<th>{m.assignedRole()}</th>
				<th><span class="sr-only">{m.actions()}</span></th>
			</tr>
		</thead>
		<tbody>
			{#each sortedSingleParticipants as participant (participant.id)}
				<tr class={CLICKABLE_ROW} onclick={rowClick(() => openUserCard(participant.user.id))}>
					<td>{@render appliedIcon(participant.applied)}</td>
					<td>
						<PersonNameButton user={participant.user} />
					</td>
					<td>{participant.school?.name ?? 'N/A'}</td>
					<td>{participant.assignedRole?.name ?? 'N/A'}</td>
					<td>{@render studentActions(participant.user)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

<Section icon="chalkboard-teacher" title={m.supervisor()}>
	<Row
		icon={conferenceSupervisor.plansOwnAttendenceAtConference ? 'map-pin' : 'cloud'}
		tone={conferenceSupervisor.plansOwnAttendenceAtConference ? 'success' : 'neutral'}
		title={m.attendancePlan()}
	>
		{conferenceSupervisor.plansOwnAttendenceAtConference
			? m.supervisorPlansOwnAttendance()
			: m.supervisorDoesNotPlanOwnAttendance()}
		{#snippet actions()}
			<input
				type="checkbox"
				class="toggle toggle-success"
				aria-label={m.attendancePlan()}
				checked={conferenceSupervisor.plansOwnAttendenceAtConference}
				onchange={() => changeAttendance(!conferenceSupervisor.plansOwnAttendenceAtConference)}
			/>
		{/snippet}
	</Row>
	<SupervisorRegistration {supervisorId} />
	{#if delegationMembers.length === 0 && singleParticipants.length === 0}
		<Empty icon="student" text={m.userCardNoStudents()} />
	{/if}
</Section>

{#if groupedDelegations.length > 0}
	<Section icon="users-three" title={m.delegations()}>
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<tbody>
					{#each groupedDelegations as group (group.delegation.id)}
						{@render delegationGroupRows(group)}
					{/each}
				</tbody>
			</table>
		</div>
	</Section>
{/if}

{#if singleParticipants.length > 0}
	<Section icon="user" title={m.adminSingleParticipants()}>
		<div class="overflow-x-auto">
			{@render singleParticipantsTable()}
		</div>
	</Section>
{/if}
