<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	let seatsQuery = $derived(data.SeatsQuery);
	let committees = $derived($seatsQuery.data?.findManyCommittees);
	let nations = $derived($seatsQuery.data?.findManyNations);
	let delegations = $derived($seatsQuery.data?.findManyDelegations);

	$inspect(nations);
</script>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-2xl font-bold">{m.seats()}</h1>

	<table class="table table-pin-rows">
		<thead>
			<tr>
				<th>
					<i class="fa-duotone fa-flag"></i>
				</th>
				{#each committees as committee}
					<th>
						<div class="tooltip" data-tip={committee.name}>
							{committee.abbreviation}
						</div>
					</th>
				{/each}
				<th><i class="fa-duotone fa-sigma"></i></th>
				<th><i class="fa-duotone fa-users-viewfinder"></i></th>
			</tr>
		</thead>
		<tbody>
			{#each nations.sort( (a, b) => getFullTranslatedCountryNameFromISO3Code(a.alpha3Code).localeCompare(getFullTranslatedCountryNameFromISO3Code(b.alpha3Code)) ) ?? [] as nation}
				{@const delegation = delegations.find(
					(d) => d.assignedNation?.alpha3Code === nation.alpha3Code
				)}
				{@const sumSeats = nation.committees.reduce((acc, committee) => {
					if (committees.flatMap((c) => c.id).includes(committee.id)) {
						return acc + committee.numOfSeatsPerDelegation;
					}
					return acc;
				}, 0)}
				<tr>
					<td>
						<div
							class="tooltip tooltip-right"
							data-tip={getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
						>
							<Flag alpha2Code={nation.alpha2Code} size="xs" />
							{nation.alpha3Code.toUpperCase()}
						</div>
					</td>
					{#each committees as committee}
						{#if nation.committees.find((c) => c.id === committee.id)}
							<td>
								{#if delegation}
									{@const assignedDelegationMember = delegation.members.filter(
										(dm) => dm.assignedCommittee?.id === committee.id
									)}
									{#if assignedDelegationMember && assignedDelegationMember.length > 0}
										{#each assignedDelegationMember as member}
											<a
												class="btn btn-outline btn-sm"
												href={`/management/${data.conferenceId}/participants?filter=${member.user.id}`}
											>
												{member.user.given_name[0].toUpperCase()}{member.user.family_name[0].toUpperCase()}
											</a>
										{/each}
									{:else}
										<i class="fas fa-dash text-gray-400"></i>
									{/if}
								{:else}
									<i class="fas fa-xmark text-gray-400"></i>
								{/if}
							</td>
						{:else}
							<td></td>
						{/if}
					{/each}
					<td>
						{delegation?.members.length ?? 0}
						{#if sumSeats !== (delegation?.members.length ?? 0)}
							<span class="text-xs">/ {sumSeats} </span>
						{/if}
					</td>
					<td>
						{#if delegation}
							<a
								class="btn btn-ghost btn-sm"
								href={`/management/${data.conferenceId}/delegations?filter=${delegation?.id}`}
							>
								<i class="fa-duotone fa-up-right-from-square"></i>
							</a>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
