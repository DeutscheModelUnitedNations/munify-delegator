<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { roleSeats, splitRole } from '#lib/helpers/conferenceRole';

	interface Props {
		delegationId: string;
		conferenceId: string;
	}

	let { delegationId, conferenceId }: Props = $props();

	const [delegation, conference] = $derived(
		await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				appliedForRoles: {
					id: true,
					rank: true,
					role: {
						id: true,
						kind: true,
						name: true,
						fontAwesomeIcon: true,
						seatAmount: true,
						nation: { alpha2Code: true, alpha3Code: true }
					}
				}
			}),
			client.liveQuery.conference({
				__args: { id: conferenceId },
				committees: {
					abbreviation: true,
					numOfSeatsPerDelegation: true,
					roles: { id: true }
				}
			})
		])
	);
	const committees = $derived(conference.committees);
	const roleApplications = $derived(delegation.appliedForRoles.toSorted((a, b) => a.rank - b.rank));
</script>

<table class="table">
	<thead>
		<tr>
			<th class="text-center"><i class="fa-sharp-duotone fa-solid fa-hashtag"></i></th>
			<th class="text-center"><i class="fa-sharp-duotone fa-solid fa-flag"></i></th>
			<th><i class="fa-sharp-duotone fa-solid fa-text"></i></th>
			<th class="text-center"><i class="fa-sharp-duotone fa-solid fa-users"></i></th>
		</tr>
	</thead>
	<tbody>
		{#each roleApplications as application, index (application.id)}
			{@const { nation, nonStateActor } = splitRole(application.role)}
			{@const committeesOfRoleApplication =
				nation && committees.filter((x) => x.roles.some((role) => role.id === application.role.id))}
			<tr>
				<td class="text-center">{index + 1}</td>
				{#if nation}
					<td class="text-center"><Flag alpha2Code={nation.alpha2Code} size="xs" /></td>
					<td class="w-full">
						{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
						{#if committeesOfRoleApplication}
							<br />
							<span class="text-base-content/70">
								{committeesOfRoleApplication.map((x) => x.abbreviation).join(', ')}
							</span>
						{/if}
					</td>
					<td class="text-center">{roleSeats({ role: application.role, committees })}</td>
				{:else if nonStateActor}
					<td class="text-center"><Flag nsa size="xs" icon={nonStateActor.fontAwesomeIcon} /></td>
					<td class="w-full">{nonStateActor.name}</td>
					<td class="text-center">{nonStateActor.seatAmount}</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>
