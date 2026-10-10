<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import FlagCard from './FlagCard.svelte';
	import CollectionStats from './CollectionStats.svelte';
	import CollapsibleCard from '$lib/components/CollapsibleCard.svelte';
	import LoadState from '$lib/components/LoadState.svelte';
	import { filterAndSortFlags } from './flagCollectionLayout';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Collapsed by default, but auto-expand when navigated via #flag-collection hash
	let isExpanded = $state(false);

	$effect(() => {
		if (browser && $page.url.hash === '#flag-collection') {
			isExpanded = true;
		}
	});

	function fetchFlagCollection() {
		return client.query.flagCollection({
			__args: { conferenceId },
			flags: {
				id: true,
				type: true,
				alpha2Code: true,
				alpha3Code: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true,
				totalPieces: true,
				foundPieces: true,
				unlockedPieces: true,
				pieces: {
					id: true,
					agendaItemId: true,
					agendaItemTitle: true,
					committeeAbbreviation: true,
					state: true
				},
				isComplete: true
			},
			stats: {
				totalFlags: true,
				completedFlags: true,
				totalPieces: true,
				foundPieces: true,
				unlockedPieces: true
			}
		});
	}

	let flagCollection = $state<Awaited<ReturnType<typeof fetchFlagCollection>>>();
	let flagsLoading = $state(false);
	let flagsError = $state<string>();

	$effect(() => {
		flagsLoading = true;
		flagsError = undefined;
		void fetchFlagCollection()
			.then((result) => {
				flagCollection = result;
			})
			.catch((error: unknown) => {
				flagsError = error instanceof Error ? error.message : String(error);
			})
			.finally(() => {
				flagsLoading = false;
			});
	});

	// Filter options
	type FilterOption = 'all' | 'incomplete' | 'unlocked' | 'complete';
	let filterState = $state<FilterOption>('all');

	type Flag = NonNullable<typeof flagCollection>['flags'][number];

	const hasUnlockedPiece = (f: Flag) => f.pieces.some((p) => p.state === 'UNLOCKED');

	/** The filter tabs, in order, each with the flags it keeps. */
	const filterOptions: { id: FilterOption; label: () => string; keep: (f: Flag) => boolean }[] = [
		{ id: 'all', label: m.filterAll, keep: () => true },
		{ id: 'incomplete', label: m.filterIncomplete, keep: (f) => !f.isComplete },
		// Flags with at least one UNLOCKED piece (not found yet)
		{ id: 'unlocked', label: m.filterUnlocked, keep: hasUnlockedPiece },
		{ id: 'complete', label: m.filterComplete, keep: (f) => f.isComplete }
	];

	let filteredFlags = $derived(
		filterAndSortFlags(
			flagCollection?.flags,
			filterOptions.find((option) => option.id === filterState)?.keep
		)
	);
</script>

{#snippet collection(data: NonNullable<typeof flagCollection>)}
	<!-- Stats -->
	<CollectionStats stats={data.stats} />

	<!-- Filter Tabs -->
	<div class="flex justify-between items-center mt-4 mb-3">
		<div class="tabs tabs-boxed">
			{#each filterOptions as option (option.id)}
				<button
					class="tab"
					class:tab-active={filterState === option.id}
					onclick={() => (filterState = option.id)}
				>
					{option.label()} ({data.flags.filter(option.keep).length})
				</button>
			{/each}
		</div>
	</div>

	<!-- Flags Grid -->
	{#if filteredFlags.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
			{#each filteredFlags as flag (flag.id)}
				<FlagCard {flag} />
			{/each}
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
			<span>{m.noFlagsInFilter()}</span>
		</div>
	{/if}
{/snippet}

<CollapsibleCard
	collapsible={false}
	id="flag-collection"
	icon="puzzle-piece"
	title={m.flagCollection()}
	description={m.flagCollectionDescription()}
	bind:expanded={isExpanded}
	contentClass="p-4 pt-0"
>
	{#snippet badge()}
		{#if flagCollection?.stats}
			<div class="badge badge-primary badge-lg gap-2">
				<i class="fa-sharp-duotone fa-solid fa-trophy"></i>
				{flagCollection.stats.completedFlags}/{flagCollection.stats.totalFlags}
			</div>
		{/if}
	{/snippet}

	<LoadState loading={flagsLoading} error={flagsError}>
		{#if flagCollection}
			{@render collection(flagCollection)}
		{:else}
			<div class="alert alert-info">
				<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
				<span>{m.noFlagsYet()}</span>
			</div>
		{/if}
	</LoadState>
</CollapsibleCard>
