<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import NationsWithCommitteesTable from '$lib/components/NationsWithCommitteesTable.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import type { Nation, NonStateActor } from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import getNumOfSeatsPerNation from '$lib/helper/getNumOfSeatsPerNation';

	interface Props {
		open: boolean;
		onClose: () => void;
		data: PageData;
	}

	let { open, onClose, data }: Props = $props();
	let api = apiClient({ origin: data.url.origin });

	let nations = $derived(() => {
		const nations = new Array<Nation>();
		data.committees.forEach((committee) => {
			committee.nations.forEach((nation) => {
				if (!nations.find((n) => n.alpha3Code === nation.alpha3Code)) nations.push(nation);
			});
		});
		return nations.sort((a, b) =>
			countryCodeToLocalName(a.alpha3Code).localeCompare(countryCodeToLocalName(b.alpha3Code))
		);
	});

	let nationsPool = $derived(() => {
		return nations()
			.filter(
				(nation) =>
					!data.delegationData?.appliedForRoles.find((role) => role.nationId === nation.alpha3Code)
			)
			.filter(
				(nation) =>
					getNumOfSeatsPerNation(nation, data.committees) >=
						(data.delegationData?.members?.length ?? 0) &&
					getNumOfSeatsPerNation(nation, data.committees) > 1
			);
	});

	let nonStateActors = $derived(() => {
		return data.nonStateActors || [];
	});

	let nonStateActorsPool = $derived(() => {
		return nonStateActors()
			.filter(
				(nsa) =>
					!data.delegationData?.appliedForRoles.find((role) => role.nonStateActorId === nsa.id)
			)
			.filter((nsa) => nsa.seatAmount >= (data.delegationData?.members.length ?? 0));
	});

	const maxDelegationSizeReached = $derived(() => {
		return (
			nationsPool().length === 0 &&
			nonStateActorsPool().length === 0 &&
			data.delegationData?.appliedForRoles.length === 0
		);
	});

	const moveEntry = async (id: string, direction: 'up' | 'down') => {
		checkForError(api.roleApplication({ id }).move.patch({ direction }));
		await invalidateAll();
	};

	const deleteEntry = async (id: string) => {
		checkForError(api.roleApplication({ id }).delete());
		await invalidateAll();
	};
</script>

<dialog class="modal {open && 'modal-open'}">
	<div class="modal-box relative w-11/12 max-w-5xl">
		<div class="flex flex-col gap-10">
			{#if maxDelegationSizeReached()}
				<div class="alert alert-error">
					<i class="fas fa-hexagon-exclamation text-5xl"></i>
					<div class="flex flex-col gap-2">
						<h2 class="text-xl font-bold">{m.delegationSizeExceeded()}</h2>
						<p>{m.delegationSizeExceededDescription()}</p>
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					<h3 class="font-bold text-xl">{m.yourPreferences()}</h3>
					<p class="text-sm">{m.yourPreferencesDescription()}</p>
					{#if !data.delegationData?.appliedForRoles || data.delegationData.appliedForRoles.length === 0}
						<div class="alert alert-warning">
							<i class="fas fa-triangle-exclamation"></i>
							<p>{m.noPreferencesSet()}</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<NationsWithCommitteesTable
								committees={data.committees.map((committee) => ({
									abbreviation: committee.abbreviation,
									name: committee.name
								}))}
							>
								{#each data.delegationData.appliedForRoles.sort((a, b) => a.rank - b.rank) as role, index}
									<tr>
										<td>
											<div class="flex items-center gap-4">
												{#if role.nonStateActor}
													<!-- TODO: Enable custom images for NSAs
											 {#if role.nonStateActors?.icon} 
												<img
													src={role.nonStateActor.icon}
													alt={role.nonStateActor.name}
													class="w-6 h-6 rounded-full"
												/>
											{:else} -->
													<Flag
														nsa
														size="xs"
														icon={role.nonStateActor.fontAwesomeIcon ?? undefined}
													/>
													<!-- {/if} -->
													<span>{role.nonStateActor.name}</span>
												{:else}
													<Flag alpha2Code={role.nation?.alpha2Code} size="xs" />
													<span
														>{countryCodeToLocalName(role.nation?.alpha3Code ?? 'Not Found')}</span
													>
												{/if}
											</div>
										</td>
										{#each data.committees as committee}
											{#if role.nonStateActor}
												<td class="text-center"><i class="fa-duotone fa-minus"></i></td>
											{:else}
												<td class="text-center">
													{#if committee.nations.find((c) => c.alpha3Code === role.nation?.alpha3Code)}
														<div class="tooltip" data-tip={committee.abbreviation}>
															{#each { length: committee.numOfSeatsPerDelegation } as _}
																<i class="fa-duotone fa-check"></i>
															{/each}
														</div>
													{/if}
												</td>
											{/if}
										{/each}
										<td class="text-center">
											{role.nonStateActor
												? role.nonStateActor.seatAmount
												: role.nation
													? getNumOfSeatsPerNation(role.nation, data.committees)
													: 0}
										</td>
										<td class="flex gap-1">
											<SquareButtonWithLoadingState
												cssClass="bg-base-200 {index === 0 && 'opacity-10'}"
												disabled={index === 0}
												icon="chevron-up"
												onClick={async () => moveEntry(role.id, 'up')}
											/>
											<SquareButtonWithLoadingState
												cssClass="bg-base-200 {index ===
													data.delegationData.appliedForRoles.length - 1 && 'opacity-10'}"
												disabled={index === data.delegationData.appliedForRoles.length - 1}
												icon="chevron-down"
												onClick={async () => moveEntry(role.id, 'down')}
											/>
											<SquareButtonWithLoadingState
												cssClass="text-error"
												duotone={false}
												icon="fa-xmark"
												onClick={async () => deleteEntry(role.id)}
											/>
										</td>
									</tr>
								{/each}
							</NationsWithCommitteesTable>
						</div>
					{/if}
				</div>

				<div class="collapse collapse-arrow bg-base-200">
					<input type="checkbox" />
					<div class="collapse-title font-bold text-xl">{m.nationsPool()}</div>
					<div class="collapse-content flex flex-col gap-4 overflow-x-auto">
						<p class="text-sm">{m.nationsPoolDescription()}</p>
						<div class="overflow-x-auto">
							<NationsWithCommitteesTable
								committees={data.committees.map((committee) => ({
									abbreviation: committee.abbreviation,
									name: committee.name
								}))}
							>
								{#each nationsPool() as nation}
									<tr>
										<td>
											<div class="flex items-center gap-4">
												<Flag alpha2Code={nation.alpha2Code} size="xs" />
												<span>{countryCodeToLocalName(nation.alpha3Code)}</span>
											</div>
										</td>
										{#each data.committees as committee}
											<td class="text-center">
												{#if committee.nations.find((c) => c.alpha3Code === nation.alpha3Code)}
													<div class="tooltip" data-tip={committee.abbreviation}>
														{#each { length: committee.numOfSeatsPerDelegation } as _}
															<i class="fa-duotone fa-check"></i>
														{/each}
													</div>
												{/if}
											</td>
										{/each}
										<td class="text-center">
											{getNumOfSeatsPerNation(nation, data.committees)}
										</td>
										<td>
											<SquareButtonWithLoadingState
												icon="fa-chevrons-up"
												cssClass="bg-base-300"
												onClick={async () => {
													if (!data.delegationData) return;
													checkForError(
														api.roleApplication.post({
															nationId: nation.alpha3Code,
															delegationId: data.delegationData.id
														})
													);
													await invalidateAll();
												}}
											/>
										</td>
									</tr>
								{/each}
							</NationsWithCommitteesTable>
						</div>
						{#if nationsPool().length === 0}
							<div class="alert alert-warning">
								<i class="fas fa-triangle-exclamation"></i>
								<p>{m.noNationsAvailable()}</p>
							</div>
						{/if}
					</div>
				</div>
				<div class="collapse collapse-arrow bg-base-200">
					<input type="checkbox" />
					<div class="collapse-title font-bold text-xl">{m.nsaPool()}</div>
					<div class="collapse-content flex flex-col gap-4 overflow-x-auto">
						<p class="text-sm">{m.nsaPoolDescription()}</p>
						<div class="overflow-x-auto">
							<table class="table">
								<thead>
									<tr>
										<th><i class="fa-duotone fa-megaphone"></i></th>
										<th><i class="fa-duotone fa-info"></i></th>
										<th class="text-center"><i class="fa-duotone fa-users"></i></th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{#each nonStateActorsPool() as nsa}
										<tr>
											<td class="align-top md:align-middle">{nsa.name}</td>
											<td><span class="text-sm">{nsa.description}</span></td>
											<td class="center align-top md:align-middle">{nsa.seatAmount}</td>
											<td class="align-top md:align-middle">
												<SquareButtonWithLoadingState
													icon="fa-chevrons-up"
													cssClass="bg-base-300"
													onClick={async () => {
														if (!data.delegationData) return;
														checkForError(
															api.roleApplication.post({
																nonStateActorId: nsa.id,
																delegationId: data.delegationData.id
															})
														);
														await invalidateAll();
													}}
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						{#if nationsPool().length === 0}
							<div class="alert alert-warning">
								<i class="fas fa-triangle-exclamation"></i>
								<p>{m.noNSAAvailable()}</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		<div class="absolute top-2 right-2">
			<button
				class="btn btn-circle btn-ghost"
				onclick={() => {
					onClose();
				}}
				aria-label="Close"><i class="fa-solid fa-xmark"></i></button
			>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button
			onclick={() => {
				onClose();
			}}>close</button
		>
	</form>
</dialog>
