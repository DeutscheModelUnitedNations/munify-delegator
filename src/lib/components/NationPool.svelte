<script lang="ts">
	import type * as schema from '../../api/db/schema';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { roleSeats, type ConferenceRoleKind } from '#lib/helpers/conferenceRole.js';
	import type { Snippet } from 'svelte';
	import Flag from './Flag.svelte';
	import NationsWithCommitteesTable from './NationsWithCommitteesTable.svelte';
	import PoolSorting from './PoolSorting.svelte';
	import getNationRegionalGroup from '#lib/helpers/getNationRegionalGroup.js';
	import { m } from '#lib/paraglide/messages.js';

	/** A conference's nation role, with the nation it stands for */
	type Nation = {
		id: string;
		kind: ConferenceRoleKind;
		seatAmount: number | null;
		nation: Pick<typeof schema.nation.$inferSelect, 'alpha2Code' | 'alpha3Code'>;
	};
	type NationPool = Nation[];
	type Committee = Pick<
		typeof schema.committee.$inferSelect,
		'abbreviation' | 'name' | 'numOfSeatsPerDelegation'
	> & {
		roles: readonly { id: string }[];
	};

	interface Props {
		committees: Committee[];
		nationPool: NationPool;
		actionCell?: Snippet<[Nation]>;
		delegationSize?: number;
	}

	let { committees, nationPool, actionCell, delegationSize }: Props = $props();

	let sortingOptions = [
		{
			key: 'alphabetical',
			name: m.alphabetical(),
			icon: 'arrow-down-a-z',
			sorting: (a: Nation, b: Nation) => {
				return getFullTranslatedCountryNameFromISO3Code(a.nation.alpha3Code).localeCompare(
					getFullTranslatedCountryNameFromISO3Code(b.nation.alpha3Code) ?? 0
				);
			}
		},
		{
			key: 'byRegion',
			name: m.byRegionalGroups(),
			icon: 'earth-europe',
			sorting: (a: Nation, b: Nation) => {
				return `${getNationRegionalGroup(a.nation.alpha3Code)}${getFullTranslatedCountryNameFromISO3Code(
					a.nation.alpha3Code
				)}`.localeCompare(
					`${getNationRegionalGroup(b.nation.alpha3Code)}${getFullTranslatedCountryNameFromISO3Code(
						b.nation.alpha3Code
					)}`
				);
			}
		},
		{
			key: 'byDelegationSize',
			name: m.byDelegationSize(),
			icon: 'hashtag',
			sorting: (a: Nation, b: Nation) =>
				`${roleSeats(a, committees)}${getFullTranslatedCountryNameFromISO3Code(a.nation.alpha3Code)}`.localeCompare(
					`${roleSeats(b, committees)}${getFullTranslatedCountryNameFromISO3Code(b.nation.alpha3Code)}`
				)
		}
	];

	let filterOptions = $derived(
		committees.map((committee) => ({
			key: committee.abbreviation,
			name: committee.abbreviation,
			filter: (nation: Nation) => committee.roles.some((role) => role.id === nation.id)
		}))
	);

	let activeSorting = $state(sortingOptions[0].key);

	let activeFilter = $state<string[]>([]);

	let activeSortingOption = $derived(
		sortingOptions.find((x) => x.key === activeSorting) ?? sortingOptions[0]
	);
	// Every active committee filter has to keep a nation
	let activeFilterOptions = $derived(filterOptions.filter((o) => activeFilter.includes(o.key)));

	let sortedNationPool = $derived(
		nationPool
			.toSorted(activeSortingOption.sorting)
			.filter((nation) => activeFilterOptions.every((o) => o.filter(nation)))
	);
</script>

{#snippet committeeSeats(committee: Committee, nation: Nation)}
	{#if committee.roles.some((role) => role.id === nation.id)}
		<div class="tooltip" data-tip={committee.abbreviation}>
			{#each { length: committee.numOfSeatsPerDelegation }}
				<i class="fa-sharp-duotone fa-solid fa-check"></i>
			{/each}
		</div>
	{:else}
		<i class="fas fa-circle-small text-[8px] text-gray-300 dark:text-gray-800"></i>
	{/if}
{/snippet}

{#snippet seatTotal(nation: Nation)}
	{@const seats = roleSeats(nation, committees)}
	{seats}
	{#if delegationSize && delegationSize < seats}
		<div
			class="tooltip tooltip-left"
			data-tip={m.tooManySeatsForDelegationSize({ size: delegationSize, seats })}
		>
			<i class="fas fa-triangle-exclamation text-warning ml-1"></i>
		</div>
	{/if}
{/snippet}

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col">
		<div class="w-full overflow-x-auto">
			<PoolSorting bind:activeSorting {sortingOptions} {filterOptions} bind:activeFilter />
			<NationsWithCommitteesTable
				committees={committees.map((committee) => ({
					abbreviation: committee.abbreviation,
					name: committee.name
				}))}
				includeActionCell={!!actionCell}
			>
				{#each sortedNationPool as nation (nation.id)}
					<tr>
						<td>
							<div class="flex items-center gap-4">
								<Flag alpha2Code={nation.nation.alpha2Code} size="xs" />
								<span>{getFullTranslatedCountryNameFromISO3Code(nation.nation.alpha3Code)}</span>
							</div>
						</td>
						<td class="tooltip" data-tip={getNationRegionalGroup(nation.nation.alpha3Code)}>
							<i class="fa-sharp-duotone fa-solid fa-earth"></i>
						</td>
						{#each committees as committee, committeeIndex (committeeIndex)}
							<td class="text-center">{@render committeeSeats(committee, nation)}</td>
						{/each}
						<td class="text-center">{@render seatTotal(nation)}</td>
						{#if actionCell}
							<td>
								{@render actionCell?.(nation)}
							</td>
						{/if}
					</tr>
				{/each}
			</NationsWithCommitteesTable>
		</div>
	</div>
</div>
