<script lang="ts">
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import getNumOfSeatsPerNation from '$lib/services/numOfSeatsPerNation';
	import type { Snippet } from 'svelte';
	import Flag from './Flag.svelte';
	import NationsWithCommitteesTable from './NationsWithCommitteesTable.svelte';
	import PoolSorting from './PoolSorting.svelte';
	import getNationRegionalGroup from '$lib/services/getNationRegionalGroup';
	import { addToPanel } from 'svelte-inspect-value';
	import { m } from '$lib/paraglide/messages';

	type Committee = NonNullable<
		MyConferenceparticipationQuery$result['findUniqueConference']
	>['committees'][number];
	type NationPool = Committee['nations'];
	type Nation = NationPool[number];

	interface Props {
		committees: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueConference']
		>['committees'];
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

	let filterOptions = committees.map((committee) => ({
		key: committee.abbreviation,
		name: committee.abbreviation,
		filter: (nation: Nation) =>
			committee.nations.map((x) => x.alpha3Code).includes(nation.alpha3Code)
	}));

	let activeSorting = $state(sortingOptions[0].key);

	let activeFilter = $state([]);

	let sortedNationPool = $state<NationPool>();

	$effect(() => {
		if (nationPool || activeSorting || activeFilter) {
			let res = nationPool
				.sort(
					sortingOptions.find((x) => x.key === activeSorting)?.sorting ?? sortingOptions[0].sorting
				)
				.filter((x) => getNumOfSeatsPerNation(x, committees) > 1);

			for (const f of activeFilter) {
				const filterFn = filterOptions.find((o) => o.key === f)?.filter;
				if (filterFn) {
					res = res.filter(filterFn);
				}
			}
			sortedNationPool = res;
		}
	});

	addToPanel('filter', () => activeFilter);
	addToPanel('filterOptions', () => filterOptions);
</script>

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
				{#each sortedNationPool ?? [] as nation}
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
						{#each committees as committee}
							<td class="text-center">
								{#if committee.nations.find((c) => c.alpha3Code === nation.alpha3Code)}
									<div class="tooltip" data-tip={committee.abbreviation}>
										{#each { length: committee.numOfSeatsPerDelegation } as _}
											<i class="fa-duotone fa-check"></i>
										{/each}
									</div>
								{:else}
									<i class="fas fa-circle-small text-[8px] text-gray-300 dark:text-gray-800"></i>
								{/if}
							</td>
						{/each}
						<td class="text-center">
							{getNumOfSeatsPerNation(nation, committees)}
							{#if delegationSize && delegationSize < getNumOfSeatsPerNation(nation, committees)}
								<div
									class="tooltip tooltip-left"
									data-tip={m.tooManySeatsForDelegationSize({
										size: delegationSize,
										seats: getNumOfSeatsPerNation(nation, committees)
									})}
								>
									<i class="fas fa-triangle-exclamation ml-1 text-warning"></i>
								</div>
							{/if}
						</td>
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
