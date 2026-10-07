<script lang="ts">
	import type { Snippet } from 'svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { m } from '$lib/paraglide/messages';
	import SquareButtonWithLoadingState from '$lib/components/SquareButtonWithLoadingState.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import getNumOfSeatsPerNation from '$lib/helpers/numOfSeatsPerNation';
	import getNationRegionalGroup from '$lib/helpers/getNationRegionalGroup';
	import NationsWithCommitteesTable from '$lib/components/NationsWithCommitteesTable.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import NationPool from '$lib/components/NationPool.svelte';
	import NsaPool from '$lib/components/NSAPool.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

	interface Props {
		onClose: () => void;
		conferenceId: string;
		delegationId: string;
	}

	let { onClose, conferenceId, delegationId }: Props = $props();

	const [conference, delegation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				committees: {
					id: true,
					abbreviation: true,
					name: true,
					numOfSeatsPerDelegation: true,
					nations: { alpha3Code: true, alpha2Code: true }
				},
				nonStateActors: {
					id: true,
					name: true,
					seatAmount: true,
					description: true,
					fontAwesomeIcon: true
				}
			}),
			client.liveQuery.delegation({
				__args: { id: delegationId },
				id: true,
				members: { id: true },
				appliedForRoles: {
					id: true,
					rank: true,
					nonStateActor: {
						id: true,
						fontAwesomeIcon: true,
						name: true,
						seatAmount: true
					},
					nation: { alpha3Code: true, alpha2Code: true }
				}
			})
		])
	);

	const appliedForRoles = $derived(delegation.appliedForRoles.toSorted((a, b) => a.rank - b.rank));

	type CommitteeNation = (typeof conference)['committees'][number]['nations'][number];

	let nations = $derived.by(() => {
		const nations = new Array<CommitteeNation>();
		conference.committees.forEach((committee) => {
			committee.nations.forEach((nation) => {
				if (!nations.find((n) => n.alpha3Code === nation.alpha3Code)) nations.push(nation);
			});
		});
		return nations.sort((a, b) =>
			getFullTranslatedCountryNameFromISO3Code(a.alpha3Code).localeCompare(
				getFullTranslatedCountryNameFromISO3Code(b.alpha3Code)
			)
		);
	});

	let nationPool = $derived(
		nations
			.filter(
				(nation) =>
					!delegation.appliedForRoles.find((role) => role.nation?.alpha3Code === nation.alpha3Code)
			)
			.filter(
				(nation) =>
					getNumOfSeatsPerNation(nation, conference.committees) >= (delegation.members?.length ?? 0)
			)
	);

	let nonStateActors = $derived(conference.nonStateActors || []);

	let nonStateActorPool = $derived(
		nonStateActors
			.filter(
				(nsa) => !delegation.appliedForRoles.find((role) => role.nonStateActor?.id === nsa.id)
			)
			.filter((nsa) => nsa.seatAmount >= (delegation.members.length ?? 0))
	);

	const maxDelegationSizeReached = $derived(
		nationPool.length === 0 &&
			nonStateActorPool.length === 0 &&
			delegation.appliedForRoles.length === 0
	);

	const swapEntry = async (firstId: string, secondId: string) => {
		const promise = client.mutate.swapRoleApplicationRanks({
			__args: { firstRoleApplicationId: firstId, secondRoleApplicationId: secondId },
			id: true,
			rank: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const applyFor = async (role: { nationId: string } | { nonStateActorId: string }) => {
		const promise = client.mutate.createRoleApplication({
			__args: { ...role, delegationId: delegation.id },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	type RoleApplication = (typeof appliedForRoles)[number];
	type Committee = (typeof conference)['committees'][number];

	const seatsOf = (role: RoleApplication) => {
		if (role.nonStateActor) return role.nonStateActor.seatAmount;
		return role.nation ? getNumOfSeatsPerNation(role.nation, conference.committees) : 0;
	};

	const deleteEntry = async (id: string) => {
		const promise = Promise.resolve(client.mutate.deleteRoleApplication({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

{#snippet roleName(role: RoleApplication)}
	<div class="flex items-center gap-4">
		{#if role.nonStateActor}
			<Flag nsa size="xs" icon={role.nonStateActor.fontAwesomeIcon ?? undefined} />
			<span>{role.nonStateActor.name}</span>
		{:else}
			<Flag alpha2Code={role.nation?.alpha2Code} size="xs" />
			<span>{getFullTranslatedCountryNameFromISO3Code(role.nation?.alpha3Code ?? 'Not Found')}</span
			>
		{/if}
	</div>
{/snippet}

<!-- A nation's seats in a committee; non-state actors have none -->
{#snippet committeeCell(role: RoleApplication, committee: Committee)}
	{#if role.nonStateActor}
		<td class="text-center"><i class="fa-duotone fa-minus"></i></td>
	{:else}
		<td class="text-center">
			{#if committee.nations.find((c) => c.alpha3Code === role.nation?.alpha3Code)}
				<div class="tooltip" data-tip={committee.abbreviation}>
					{#each Array.from({ length: committee.numOfSeatsPerDelegation }, (_, seat) => seat) as seat (seat)}
						<i class="fa-duotone fa-check"></i>
					{/each}
				</div>
			{/if}
		</td>
	{/if}
{/snippet}

{#snippet roleRow(role: RoleApplication, index: number)}
	<tr>
		<td>
			{@render roleName(role)}
		</td>
		{#if role.nonStateActor}
			<td><i class="fa-duotone fa-minus"></i></td>
		{:else}
			<td
				class="tooltip"
				data-tip={role.nation ? getNationRegionalGroup(role.nation.alpha3Code) : undefined}
			>
				<i class="fa-duotone fa-earth"></i>
			</td>
		{/if}
		{#each conference.committees as committee (committee.id)}
			{@render committeeCell(role, committee)}
		{/each}
		<td class="text-center">
			{seatsOf(role)}
		</td>
		<td class="flex gap-1">
			<SquareButtonWithLoadingState
				cssClass="bg-base-200 {index === 0 && 'opacity-10'}"
				disabled={index === 0}
				icon="chevron-up"
				onClick={async () => {
					const previous = appliedForRoles[index - 1];
					swapEntry(role.id, previous.id);
				}}
			/>
			<SquareButtonWithLoadingState
				cssClass="bg-base-200 {index === delegation.appliedForRoles.length - 1 && 'opacity-10'}"
				disabled={index === delegation.appliedForRoles.length - 1}
				icon="chevron-down"
				onClick={async () => {
					const next = appliedForRoles[index + 1];
					swapEntry(role.id, next.id);
				}}
			/>
			<SquareButtonWithLoadingState
				cssClass="text-error"
				duotone={false}
				icon="fa-xmark"
				onClick={async () => deleteEntry(role.id)}
			/>
		</td>
	</tr>
{/snippet}

{#snippet preferences()}
	<div class="flex flex-col gap-4">
		<h3 class="text-xl font-bold">{m.yourPreferences()}</h3>
		<p class="text-sm">{m.yourPreferencesDescription()}</p>
		{#if appliedForRoles.length === 0}
			<div class="alert alert-warning">
				<i class="fas fa-triangle-exclamation"></i>
				<p>{m.noPreferencesSet()}</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<NationsWithCommitteesTable
					committees={conference.committees.map((committee) => ({
						abbreviation: committee.abbreviation,
						name: committee.name
					}))}
					includeActionCell
				>
					{#each appliedForRoles as role, index (role.id)}
						{@render roleRow(role, index)}
					{/each}
				</NationsWithCommitteesTable>
			</div>
		{/if}
	</div>
{/snippet}

<!-- A collapsible pool of roles that can still be applied for -->
{#snippet pool(
	title: string,
	description: string,
	emptyText: string,
	empty: boolean,
	list: Snippet
)}
	<div class="collapse-arrow bg-base-200 collapse">
		<input type="checkbox" />
		<div class="collapse-title text-xl font-bold">{title}</div>
		<div class="collapse-content flex flex-col gap-4 overflow-x-auto">
			<p class="text-sm">{description}</p>
			{@render list()}
			{#if empty}
				<div class="alert alert-warning">
					<i class="fas fa-triangle-exclamation"></i>
					<p>{emptyText}</p>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet nationList()}
	<NationPool
		committees={conference.committees}
		{nationPool}
		delegationSize={delegation.members.length}
	>
		{#snippet actionCell(nation: (typeof nations)[number])}
			<SquareButtonWithLoadingState
				icon="fa-chevrons-up"
				cssClass="bg-base-300"
				onClick={async () => applyFor({ nationId: nation.alpha3Code })}
			/>
		{/snippet}
	</NationPool>
{/snippet}

{#snippet nsaList()}
	<NsaPool {nonStateActorPool}>
		{#snippet actionCell(nsa)}
			<SquareButtonWithLoadingState
				icon="fa-chevrons-up"
				cssClass="bg-base-300"
				onClick={async () => applyFor({ nonStateActorId: nsa.id })}
			/>
		{/snippet}
	</NsaPool>
{/snippet}

<dialog class="modal modal-open">
	<div class="modal-box relative w-11/12 max-w-5xl">
		<div class="flex flex-col gap-10">
			{#if maxDelegationSizeReached}
				<div class="alert alert-error">
					<i class="fas fa-hexagon-exclamation text-5xl"></i>
					<div class="flex flex-col gap-2">
						<h2 class="text-xl font-bold">{m.delegationSizeExceeded()}</h2>
						<p>{m.delegationSizeExceededDescription()}</p>
					</div>
				</div>
			{:else}
				{@render preferences()}
				{@render pool(
					m.nationsPool(),
					m.nationsPoolDescription(),
					m.noNationsAvailable(),
					nationPool.length === 0,
					nationList
				)}
				{@render pool(
					m.nsaPool(),
					m.nsaPoolDescription(),
					m.noNSAAvailable(),
					nonStateActorPool.length === 0,
					nsaList
				)}
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
