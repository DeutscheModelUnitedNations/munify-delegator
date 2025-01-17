<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import type { PageData } from './$houdini';
	import DownloadCommitteeDataBtn from './DownloadCommitteeDataBtn.svelte';

	let { data }: { data: PageData } = $props();

	let seatsQuery = $derived(data.SeatsQuery);
	let committees = $derived($seatsQuery.data?.findManyCommittees ?? []);
	let nations = $derived($seatsQuery.data?.findManyNations ?? []);
	let delegations = $derived($seatsQuery.data?.findManyDelegations ?? []);
	let nonStateActors = $derived($seatsQuery.data?.findManyNonStateActors ?? []);
</script>

<div class="flex w-full flex-col items-start gap-10 p-4">
	<section class="flex w-full flex-col items-start gap-4">
		<h1 class="text-2xl font-bold">{m.nationSeats()}</h1>
		<div class="block w-full overflow-y-scroll md:contents">
			<table class="table table-pin-rows text-center">
				<thead>
					<tr>
						<td> </td>
						{#each committees as committee}
							<th>
								<DownloadCommitteeDataBtn {committee} />
							</th>
						{/each}
					</tr>
					<tr>
						<td><i class="fa-duotone fa-sigma"></i></td>
						{#each committees as committee}
							{@const occupiedSeats = delegations.reduce((acc, delegation) => {
								return (
									acc +
									delegation.members.filter((dm) => dm.assignedCommittee?.id === committee.id)
										.length
								);
							}, 0)}
							{@const sumSeats = nations.reduce((acc, nation) => {
								if (nation.committees.find((c) => c.id === committee.id)) {
									return (
										acc +
										(nation.committees.find((c) => c.id === committee.id)
											?.numOfSeatsPerDelegation ?? 0)
									);
								}
								return acc;
							}, 0)}
							<td>
								{occupiedSeats}
								<span class="text-xs font-normal">/ {sumSeats} </span>
							</td>
						{/each}
					</tr>
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
													<div
														class="tooltip"
														data-tip={formatNames(member.user.given_name, member.user.family_name)}
													>
														<a
															class="btn btn-outline btn-sm"
															href={`/management/${data.conferenceId}/participants?filter=${member.user.id}`}
														>
															{formatInitials(member.user.given_name, member.user.family_name)}
														</a>
													</div>
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
										aria-label="View delegation"
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
	</section>

	<section class="flex w-full flex-col items-start gap-4">
		<h1 class="text-2xl font-bold">{m.nsaSeats()}</h1>
		<div class="block w-full overflow-y-scroll md:contents">
			<table class="table table-pin-rows text-center">
				<thead>
					<tr>
						<td>
							<i class="fa-duotone fa-megaphone"></i>
						</td>
						<td>
							<i class="fa-duotone fa-users"></i>
						</td>
						<td>
							<i class="fa-duotone fa-sigma"></i>
						</td>
						<td>
							<i class="fa-duotone fa-users-viewfinder"></i>
						</td>
					</tr>
				</thead>
				<tbody>
					{#each nonStateActors as nsa}
						{@const delegation = delegations.find((d) => d.assignedNonStateActor?.id === nsa.id)}
						<tr>
							<td>
								<div class="tooltip tooltip-right flex flex-col items-center" data-tip={nsa.name}>
									<Flag nsa icon={nsa.fontAwesomeIcon ?? ''} size="xs" />
									{nsa.abbreviation.toUpperCase()}
								</div>
							</td>
							<td class="w-full">
								{#if delegation}
									<div class="flex gap-1">
										{#each delegation.members as member}
											<a
												class="btn btn-outline btn-sm"
												href={`/management/${data.conferenceId}/participants?filter=${member.user.id}`}
											>
												{formatInitials(member.user.given_name, member.user.family_name)}
											</a>
										{/each}
									</div>
								{:else}
									<i class="fas fa-dash text-gray-400"></i>
								{/if}
							</td>
							<td>
								{delegation?.members.length ?? 0}
								{#if nsa.seatAmount !== (delegation?.members.length ?? 0)}
									<span class="text-xs">/ {nsa.seatAmount} </span>
								{/if}
							</td>
							<td>
								{#if delegation}
									<a
										class="btn btn-ghost btn-sm"
										href={`/management/${data.conferenceId}/delegations?filter=${delegation?.id}`}
										aria-label="View delegation"
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
	</section>
</div>
