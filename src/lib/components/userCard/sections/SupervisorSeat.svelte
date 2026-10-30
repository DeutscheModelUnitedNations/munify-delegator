<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import PersonName from '../PersonName.svelte';
	import OpenUserCardButton from '../OpenUserCardButton.svelte';
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
						fontAwesomeIcon: true,
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
		<i class="fa-sharp-duotone fa-solid fa-circle-check text-success"></i>
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-hourglass-half text-error"></i>
	{/if}
{/snippet}

{#snippet delegationAssignment(delegation: Group['delegation'], members: Group['members'])}
	{@const schools = delegationSchoolsLabel(members)}
	{@const { nation, nonStateActor } = splitRole(delegation.assignedRole)}
	{#if nation}
		<Flag alpha2Code={nation.alpha2Code} size="xs" />
	{:else if nonStateActor}
		<Flag nsa icon={nonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
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
	<tr class="bg-base-200/50">
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
		<tr class="text-sm">
			<td class="text-right">
				<i class="fa-sharp-duotone fa-solid fa-arrow-turn-down-right text-base-content/40"></i>
			</td>
			<td colspan="2">
				<PersonName
					givenName={member.user.givenName}
					familyName={member.user.familyName}
					isHeadDelegate={member.isHeadDelegate}
				/>
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
		<OpenUserCardButton user={student} />
		<button
			class="btn btn-ghost btn-xs btn-square text-error"
			onclick={() => removeSupervision(conferenceSupervisor, student)}
			aria-label={m.removeSupervision()}
			title={m.removeSupervision()}
		>
			<i class="fa-sharp-duotone fa-solid fa-link-slash"></i>
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
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each sortedSingleParticipants as participant (participant.id)}
				<tr>
					<td>{@render appliedIcon(participant.applied)}</td>
					<td>
						<PersonName
							givenName={participant.user.givenName}
							familyName={participant.user.familyName}
						/>
					</td>
					<td>{participant.school?.name ?? 'N/A'}</td>
					<td>{participant.assignedRole?.name ?? 'N/A'}</td>
					<td>{@render studentActions(participant.user)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

<div class="flex flex-col gap-6">
	<h3 class="text-lg font-bold">{m.supervisor()}</h3>
	<label class="bg-base-200 rounded-box flex cursor-pointer items-center gap-4 p-4">
		{#if conferenceSupervisor.plansOwnAttendenceAtConference}
			<i class="fa-sharp-duotone fa-solid fa-location-check text-success text-xl"></i>
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-cloud text-base-content/50 text-xl"></i>
		{/if}
		<div class="flex grow flex-col">
			<span class="font-semibold">{m.attendancePlan()}</span>
			<span class="text-base-content/60 text-sm">
				{conferenceSupervisor.plansOwnAttendenceAtConference
					? m.supervisorPlansOwnAttendance()
					: m.supervisorDoesNotPlanOwnAttendance()}
			</span>
		</div>
		<input
			type="checkbox"
			class="toggle toggle-success"
			checked={conferenceSupervisor.plansOwnAttendenceAtConference}
			onchange={() => changeAttendance(!conferenceSupervisor.plansOwnAttendenceAtConference)}
		/>
	</label>

	<!-- Students list -->
	{#if delegationMembers.length === 0 && singleParticipants.length === 0}
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-graduation-cap"></i>
			<span>{m.userCardNoStudents()}</span>
		</div>
	{/if}

	{#if groupedDelegations.length > 0}
		<div>
			<div class="divider"></div>
			<h3 class="mb-2 text-lg font-bold">
				{m.delegations()}
			</h3>
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<tbody>
						{#each groupedDelegations as group (group.delegation.id)}
							{@render delegationGroupRows(group)}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	{#if singleParticipants.length > 0}
		<div>
			<div class="divider"></div>
			<h3 class="mb-2 text-lg font-bold">
				{m.adminSingleParticipants()}
			</h3>
			<div class="overflow-x-auto">
				{@render singleParticipantsTable()}
			</div>
		</div>
	{/if}
</div>
