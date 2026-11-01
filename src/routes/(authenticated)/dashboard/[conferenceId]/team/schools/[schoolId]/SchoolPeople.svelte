<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import PersonName from '#lib/components/userCard/PersonName.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { schoolPeople, type SchoolPersonKind, type SchoolPersonStage } from './schoolPeople';

	/** Everyone the school has in this conference, each by their own school. */
	interface Props {
		schoolId: string;
		conferenceId: string;
	}

	let { schoolId, conferenceId }: Props = $props();

	const registration = { applied: true, assignedRoleId: true } as const;
	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, schoolId: { eq: schoolId } } },
			didAttend: true,
			user: { id: true, givenName: true, familyName: true },
			delegationMember: { isHeadDelegate: true, delegation: registration },
			singleParticipant: registration,
			conferenceSupervisor: { id: true }
		})
	);
	// one plain copy, read once
	const people = $derived(schoolPeople(participants.slice()));

	const kindLabels: Record<SchoolPersonKind, () => string> = {
		DELEGATION_MEMBER: m.delegationMember,
		SINGLE_PARTICIPANT: m.singleParticipant,
		SUPERVISOR: m.supervisor
	};
	const stages: Record<SchoolPersonStage, { label: () => string; badge: string }> = {
		REGISTERED: { label: m.notApplied, badge: 'badge-ghost' },
		APPLIED: { label: m.applied, badge: 'badge-info' },
		SEATED: { label: m.schoolsSeated, badge: 'badge-success' }
	};
</script>

<section class="flex flex-col gap-4" aria-label={m.schoolPeople()}>
	<h3 class="text-lg font-bold">
		{m.schoolPeople()}
		<span class="badge badge-sm align-middle">{people.length}</span>
	</h3>
	{#if people.length === 0}
		<p class="text-base-content/60">{m.schoolPeopleEmpty()}</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-zebra table">
				<thead>
					<tr>
						<th>{m.name()}</th>
						<th>{m.role()}</th>
						<th>{m.status()}</th>
						<th class="text-center">{m.schoolMetricsAttended()}</th>
					</tr>
				</thead>
				<tbody>
					{#each people as person (person.userId)}
						<tr>
							<td>
								<button
									class="cursor-pointer text-left hover:underline"
									onclick={() => openUserCard(person.userId)}
								>
									<PersonName
										givenName={person.givenName}
										familyName={person.familyName}
										isHeadDelegate={person.isHeadDelegate}
									/>
								</button>
							</td>
							<td>{kindLabels[person.kind]()}</td>
							<td>
								{#if person.stage}
									<span class="badge badge-sm {stages[person.stage].badge}">
										{stages[person.stage].label()}
									</span>
								{/if}
							</td>
							<td class="text-center">
								{#if person.didAttend}
									<i
										class="fa-sharp-duotone fa-solid fa-check text-success"
										title={m.schoolMetricsAttended()}
									></i>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
