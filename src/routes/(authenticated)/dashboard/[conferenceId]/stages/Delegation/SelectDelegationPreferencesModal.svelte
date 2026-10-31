<script lang="ts">
	import type { Snippet } from 'svelte';
	import Flag from '#lib/components/Flag.svelte';
	import { m } from '#lib/paraglide/messages';
	import SquareButtonWithLoadingState from '#lib/components/SquareButtonWithLoadingState.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { roleSeats, splitRole } from '#lib/helpers/conferenceRole';
	import getNationRegionalGroup from '#lib/helpers/getNationRegionalGroup';
	import NationsWithCommitteesTable from '#lib/components/NationsWithCommitteesTable.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import NationPool from '#lib/components/NationPool.svelte';
	import NsaPool from '#lib/components/NSAPool.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	interface Props {
		onClose: () => void;
		conferenceId: string;
		delegationId: string;
	}

	let { onClose, conferenceId, delegationId }: Props = $props();

	const roleFields = {
		id: true,
		kind: true,
		name: true,
		description: true,
		seatAmount: true,
		fontAwesomeIcon: true,
		nation: { alpha3Code: true, alpha2Code: true }
	} as const;

	const [conference, delegation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				committees: {
					id: true,
					abbreviation: true,
					name: true,
					numOfSeatsPerDelegation: true,
					roles: { id: true }
				},
				roles: roleFields
			}),
			client.liveQuery.delegation({
				__args: { id: delegationId },
				id: true,
				members: { id: true },
				appliedForRoles: { id: true, rank: true, role: roleFields }
			})
		])
	);

	const appliedForRoles = $derived(delegation.appliedForRoles.toSorted((a, b) => a.rank - b.rank));
	const appliedRoleIds = $derived(new Set(delegation.appliedForRoles.map((a) => a.role.id)));

	let nations = $derived(
		conference.roles
			.flatMap((role) =>
				role.kind === 'NATION' && role.nation
					? [{ id: role.id, kind: role.kind, seatAmount: role.seatAmount, nation: role.nation }]
					: []
			)
			.sort((a, b) =>
				getFullTranslatedCountryNameFromISO3Code(a.nation.alpha3Code).localeCompare(
					getFullTranslatedCountryNameFromISO3Code(b.nation.alpha3Code)
				)
			)
	);

	let nationPool = $derived(
		nations
			.filter((nation) => !appliedRoleIds.has(nation.id))
			.filter(
				(nation) =>
					roleSeats({ role: nation, committees: conference.committees }) >=
					(delegation.members?.length ?? 0)
			)
	);

	let nonStateActorPool = $derived(
		conference.roles
			.filter((role) => role.kind === 'NON_STATE_ACTOR')
			.filter((nsa) => !appliedRoleIds.has(nsa.id))
			.filter((nsa) => (nsa.seatAmount ?? 0) >= (delegation.members.length ?? 0))
	);

	const maxDelegationSizeReached = $derived(
		nationPool.length === 0 &&
			nonStateActorPool.length === 0 &&
			delegation.appliedForRoles.length === 0
	);

	const swapEntry = async ({ firstId, secondId }: { firstId: string; secondId: string }) => {
		const promise = client.mutate.swapRoleApplicationRanks({
			__args: { firstRoleApplicationId: firstId, secondRoleApplicationId: secondId },
			id: true,
			rank: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const applyFor = async (roleId: string) => {
		const promise = client.mutate.createRoleApplication({
			__args: { roleId, delegationId: delegation.id },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	type RoleApplication = (typeof appliedForRoles)[number];
	type Committee = (typeof conference)['committees'][number];

	const seatsOf = (application: RoleApplication) =>
		roleSeats({ role: application.role, committees: conference.committees });

	const deleteEntry = async (id: string) => {
		const promise = Promise.resolve(client.mutate.deleteRoleApplication({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

{#snippet roleName(application: RoleApplication)}
	{@const { nation, nonStateActor } = splitRole(application.role)}
	<div class="flex items-center gap-4">
		{#if nonStateActor}
			<Flag nsa size="xs" icon={nonStateActor.fontAwesomeIcon ?? undefined} />
			<span>{nonStateActor.name}</span>
		{:else}
			<Flag alpha2Code={nation?.alpha2Code} size="xs" />
			<span>{getFullTranslatedCountryNameFromISO3Code(nation?.alpha3Code ?? 'Not Found')}</span>
		{/if}
	</div>
{/snippet}

<!-- A nation's seats in a committee; non-state actors have none -->
{#snippet committeeCell(application: RoleApplication, committee: Committee)}
	{#if application.role.kind === 'NON_STATE_ACTOR'}
		<td class="text-center"><i class="fa-sharp-duotone fa-solid fa-minus"></i></td>
	{:else}
		<td class="text-center">
			{#if committee.roles.some((seated) => seated.id === application.role.id)}
				<div class="tooltip" data-tip={committee.abbreviation}>
					{#each Array.from({ length: committee.numOfSeatsPerDelegation }, (_, seat) => seat) as seat (seat)}
						<i class="fa-sharp-duotone fa-solid fa-check"></i>
					{/each}
				</div>
			{/if}
		</td>
	{/if}
{/snippet}

{#snippet roleRow(role: RoleApplication, index: number)}
	{@const nation = role.role.nation}
	<tr>
		<td>
			{@render roleName(role)}
		</td>
		{#if role.role.kind === 'NON_STATE_ACTOR'}
			<td><i class="fa-sharp-duotone fa-solid fa-minus"></i></td>
		{:else}
			<td class="tooltip" data-tip={nation ? getNationRegionalGroup(nation.alpha3Code) : undefined}>
				<i class="fa-sharp-duotone fa-solid fa-earth"></i>
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
					swapEntry({ firstId: role.id, secondId: previous.id });
				}}
			/>
			<SquareButtonWithLoadingState
				cssClass="bg-base-200 {index === delegation.appliedForRoles.length - 1 && 'opacity-10'}"
				disabled={index === delegation.appliedForRoles.length - 1}
				icon="chevron-down"
				onClick={async () => {
					const next = appliedForRoles[index + 1];
					swapEntry({ firstId: role.id, secondId: next.id });
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
		{#snippet actionCell(nation)}
			<SquareButtonWithLoadingState
				icon="fa-chevrons-up"
				cssClass="bg-base-300"
				onClick={async () => applyFor(nation.id)}
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
				onClick={async () => applyFor(nsa.id)}
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
				aria-label={m.close()}><i class="fa-sharp-duotone fa-solid fa-xmark"></i></button
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
