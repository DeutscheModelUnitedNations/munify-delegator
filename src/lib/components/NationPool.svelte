<script lang="ts">
	import type { Row } from '$api/db/rows';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import getNumOfSeatsPerNation from '$lib/helpers/numOfSeatsPerNation';
	import type { Snippet } from 'svelte';
	import Flag from './Flag.svelte';
	import NationsWithCommitteesTable from './NationsWithCommitteesTable.svelte';
	import PoolSorting from './PoolSorting.svelte';
	import getNationRegionalGroup from '$lib/helpers/getNationRegionalGroup';
	import { m } from '$lib/paraglide/messages';

	type Nation = Pick<Row<'nation'>, 'alpha2Code' | 'alpha3Code'>;
	type NationPool = Nation[];
	type Committee = Pick<Row<'committee'>, 'abbreviation' | 'name' | 'numOfSeatsPerDelegation'> & {
		nations: Pick<Row<'nation'>, 'alpha3Code'>[];
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
				return getFullTranslatedCountryNameFromISO3Code(a.alpha3Code).localeCompare(
					getFullTranslatedCountryNameFromISO3Code(b.alpha3Code) ?? 0
				);
			}
		},
		{
			key: 'byRegion',
			name: m.byRegionalGroups(),
			icon: 'earth-europe',
			sorting: (a: Nation, b: Nation) => {
				return `${getNationRegionalGroup(a.alpha3Code)}${getFullTranslatedCountryNameFromISO3Code(
					a.alpha3Code
				)}`.localeCompare(
					`${getNationRegionalGroup(b.alpha3Code)}${getFullTranslatedCountryNameFromISO3Code(
						b.alpha3Code
					)}`
				);
			}
		},
		{
			key: 'byDelegationSize',
			name: m.byDelegationSize(),
			icon: 'hashtag',
			sorting: (a: Nation, b: Nation) =>
				`${getNumOfSeatsPerNation(a, committees)}${getFullTranslatedCountryNameFromISO3Code(a.alpha3Code)}`.localeCompare(
					`${getNumOfSeatsPerNation(b, committees)}${getFullTranslatedCountryNameFromISO3Code(b.alpha3Code)}`
				)
		}
	];

	let filterOptions = $derived(
		committees.map((committee) => ({
			key: committee.abbreviation,
			name: committee.abbreviation,
			filter: (nation: Nation) =>
				committee.nations.map((x) => x.alpha3Code).includes(nation.alpha3Code)
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
	{#if committee.nations.find((c) => c.alpha3Code === nation.alpha3Code)}
		<div class="tooltip" data-tip={committee.abbreviation}>
			{#each { length: committee.numOfSeatsPerDelegation }}
				<i class="fa-duotone fa-check"></i>
			{/each}
		</div>
	{:else}
		<i class="fas fa-circle-small text-[8px] text-gray-300 dark:text-gray-800"></i>
	{/if}
{/snippet}

{#snippet seatTotal(nation: Nation)}
	{@const seats = getNumOfSeatsPerNation(nation, committees)}
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
				{#each sortedNationPool as nation (nation.alpha3Code)}
					<tr>
						<td>
							<div class="flex items-center gap-4">
								<Flag alpha2Code={nation.alpha2Code} size="xs" />
								<span>{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}</span>
							</div>
						</td>
						<td class="tooltip" data-tip={getNationRegionalGroup(nation.alpha3Code)}>
							<i class="fa-duotone fa-earth"></i>
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
