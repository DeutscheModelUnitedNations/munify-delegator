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
					!data.delegationData.appliedForRoles.find((role) => role.nationId === nation.alpha3Code)
			)
			.filter((nation) => getNumOfSeatsPerNation(nation) >= data.delegationData?.members.length);
	});

	let nonStateActors = $derived(() => {
		return data.nonStateActors || [];
	});

	let nonStateActorsPool = $derived(() => {
		return nonStateActors()
			.filter(
				(nsa) =>
					!data.delegationData.appliedForRoles.find((role) => role.nonStateActorId === nsa.id)
			)
			.filter((nsa) => nsa.seatAmount >= data.delegationData?.members.length);
	});

	const getNumOfSeatsPerNation = (nation: Nation) => {
		let numOfSeats = 0;
		data.committees.forEach((committee) => {
			if (committee.nations.find((c) => c.alpha3Code === nation.alpha3Code))
				numOfSeats += committee.numOfSeatsPerDelegation;
		});
		return numOfSeats;
	};

	const moveEntry = async (id: string, direction: 'up' | 'down') => {
		checkForError(api.roleApplication({ id }).move.patch({ direction }));
		invalidateAll();
	};

	const deleteEntry = async (id: string) => {
		checkForError(api.roleApplication({ id }).delete());
		invalidateAll();
	};
</script>

<dialog class="modal {open && 'modal-open'}">
	<div class="modal-box relative w-11/12 max-w-5xl">
		<div class="flex flex-col gap-10">
			<div class="flex flex-col gap-4">
				<h3 class="font-bold text-xl">{m.yourPreferences()}</h3>
				<p class="text-sm">{m.yourPreferencesDescription()}</p>
				{#if !data.delegationData?.appliedForRoles || data.delegationData.appliedForRoles.length === 0}
					<div class="alert alert-warning">
						<i class="fas fa-triangle-exclamation"></i>
						<p>{m.noPreferencesSet()}</p>
					</div>
				{:else}
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
											{#if role.nonStateActors?.icon}
												<img
													src={role.nonStateActor.icon}
													alt={role.nonStateActor.name}
													class="w-6 h-6 rounded-full"
												/>
											{:else}
												<Flag nsa size="xs" />
											{/if}
											<span>{role.nonStateActor.name}</span>
										{:else}
											<Flag alpha2Code={role.nation.alpha2Code} size="xs" />
											<span>{countryCodeToLocalName(role.nation.alpha3Code)}</span>
										{/if}
									</div>
								</td>
								{#each data.committees as committee}
									{#if role.nonStateActor}
										<td class="text-center"><i class="fa-duotone fa-minus"></i></td>
									{:else}
										<td class="text-center">
											{#if committee.nations.find((c) => c.alpha3Code === role.nation.alpha3Code)}
												{#each { length: committee.numOfSeatsPerDelegation } as _}
													<i class="fa-duotone fa-check"></i>
												{/each}
											{/if}
										</td>
									{/if}
								{/each}
								<td class="text-center">
									{role.nonStateActor
										? role.nonStateActor.seatAmount
										: getNumOfSeatsPerNation(role.nation)}
								</td>
								<td>
									<button
										class="btn btn-square bg-base-200 btn-sm {index === 0 && 'opacity-10'}"
										disabled={index === 0}
										onclick={() => moveEntry(role.id, 'up')}
										><i class="fa-duotone fa-chevron-up"></i></button
									>
									<button
										class="btn btn-square bg-base-200 btn-sm {index ===
											data.delegationData.appliedForRoles.length - 1 && 'opacity-10'}"
										disabled={index === data.delegationData.appliedForRoles.length - 1}
										onclick={() => moveEntry(role.id, 'down')}
										><i class="fa-duotone fa-chevron-down"></i></button
									>
									<button
										class="btn btn-square text-error bg-base-200 btn-sm"
										onclick={() => deleteEntry(role.id)}><i class="fa-solid fa-xmark"></i></button
									>
								</td>
							</tr>
						{/each}
					</NationsWithCommitteesTable>
				{/if}
			</div>
			<div class="flex flex-col gap-4">
				<h3 class="font-bold text-xl">{m.nationsPool()}</h3>
				<p class="text-sm">{m.nationsPoolDescription()}</p>
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
										{#each { length: committee.numOfSeatsPerDelegation } as _}
											<i class="fa-duotone fa-check"></i>
										{/each}
									{/if}
								</td>
							{/each}
							<td class="text-center">
								{getNumOfSeatsPerNation(nation)}
							</td>
							<td>
								<button
									class="btn btn-square bg-base-200 btn-sm"
									onclick={() => {
										checkForError(
											api.roleApplication.post({
												nationId: nation.alpha3Code,
												delegationId: data.delegationData.id
											})
										);
										invalidateAll();
									}}><i class="fa-duotone fa-chevrons-up"></i></button
								>
							</td>
						</tr>
					{/each}
				</NationsWithCommitteesTable>
			</div>
			<div class="flex flex-col gap-4">
				<h3 class="font-bold text-xl">{m.nsaPool()}</h3>
				<p class="text-sm">{m.nsaPoolDescription()}</p>

				<table class="table">
					<thead>
						<tr>
							<th><i class="fa-duotone fa-text"></i></th>
							<th><i class="fa-duotone fa-info"></i></th>
							<th class="text-center"><i class="fa-duotone fa-users"></i></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each nonStateActorsPool() as nsa}
							<tr>
								<td>{nsa.name}</td>
								<td><span class="text-sm">{nsa.description}</span></td>
								<td class="center">{nsa.seatAmount}</td>
								<td>
									<button
										class="btn btn-square bg-base-200 btn-sm"
										onclick={() => {
											checkForError(
												api.roleApplication.post({
													nonStateActorId: nsa.id,
													delegationId: data.delegationData.id
												})
											);
											invalidateAll();
										}}><i class="fa-duotone fa-chevrons-up"></i></button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="absolute top-2 right-2">
			<button
				class="btn btn-circle btn-ghost"
				onclick={() => {
					onClose();
				}}><i class="fa-solid fa-xmark"></i></button
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
