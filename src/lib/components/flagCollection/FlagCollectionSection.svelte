<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import FlagCard from './FlagCard.svelte';
	import CollectionStats from './CollectionStats.svelte';

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

	const flagCollectionQuery = graphql(`
		query FlagCollectionQuery($conferenceId: String!) {
			flagCollection(conferenceId: $conferenceId) {
				flags {
					id
					type
					alpha2Code
					alpha3Code
					name
					abbreviation
					fontAwesomeIcon
					totalPieces
					foundPieces
					unlockedPieces
					pieces {
						id
						agendaItemId
						agendaItemTitle
						committeeAbbreviation
						state
					}
					isComplete
				}
				stats {
					totalFlags
					completedFlags
					totalPieces
					foundPieces
					unlockedPieces
				}
			}
		}
	`);

	$effect(() => {
		flagCollectionQuery.fetch({ variables: { conferenceId } });
	});

	// Filter options
	type FilterOption = 'all' | 'incomplete' | 'unlocked' | 'complete';
	let filterState = $state<FilterOption>('all');

	let filteredFlags = $derived.by(() => {
		const flags = $flagCollectionQuery.data?.flagCollection?.flags ?? [];
		let filtered: typeof flags;
		switch (filterState) {
			case 'incomplete':
				filtered = flags.filter((f) => !f.isComplete);
				break;
			case 'unlocked':
				// Flags with at least one UNLOCKED piece (not found yet)
				filtered = flags.filter((f) => f.pieces.some((p) => p.state === 'UNLOCKED'));
				break;
			case 'complete':
				filtered = flags.filter((f) => f.isComplete);
				break;
			default:
				filtered = [...flags];
		}
		// Sort by pieces discovered (descending), then alphabetically by name
		return filtered.sort((a, b) => {
			if (b.foundPieces !== a.foundPieces) {
				return b.foundPieces - a.foundPieces;
			}
			return a.name.localeCompare(b.name);
		});
	});
</script>

<div id="flag-collection" class="card bg-base-200 border border-base-300">
	<!-- Header -->
	<div
		class="p-4 flex items-center justify-between cursor-pointer hover:bg-base-300/30 transition-colors rounded-t-lg"
		onclick={() => (isExpanded = !isExpanded)}
		onkeypress={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
		role="button"
		tabindex="0"
	>
		<div class="flex items-center gap-3">
			<i class="fa-solid {isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-base-content/50"
			></i>
			<i class="fa-solid fa-puzzle-piece text-primary text-xl"></i>
			<div>
				<h3 class="text-lg font-bold">{m.flagCollection()}</h3>
				<p class="text-sm text-base-content/60">{m.flagCollectionDescription()}</p>
			</div>
		</div>
		{#if $flagCollectionQuery.data?.flagCollection?.stats}
			{@const stats = $flagCollectionQuery.data.flagCollection.stats}
			<div class="badge badge-primary badge-lg gap-2">
				<i class="fa-solid fa-trophy"></i>
				{stats.completedFlags}/{stats.totalFlags}
			</div>
		{/if}
	</div>

	{#if isExpanded}
		<div class="p-4 pt-0">
			{#if $flagCollectionQuery.fetching}
				<div class="flex justify-center p-8">
					<i class="fa-duotone fa-spinner fa-spin text-4xl"></i>
				</div>
			{:else if $flagCollectionQuery.errors?.length}
				<div class="alert alert-error">
					<i class="fa-solid fa-exclamation-triangle"></i>
					<span>{$flagCollectionQuery.errors[0].message}</span>
				</div>
			{:else if $flagCollectionQuery.data?.flagCollection}
				{@const data = $flagCollectionQuery.data.flagCollection}

				<!-- Stats -->
				<CollectionStats stats={data.stats} />

				<!-- Filter Tabs -->
				<div class="flex justify-between items-center mt-4 mb-3">
					<div class="tabs tabs-boxed">
						<button
							class="tab"
							class:tab-active={filterState === 'all'}
							onclick={() => (filterState = 'all')}
						>
							{m.filterAll()} ({data.flags.length})
						</button>
						<button
							class="tab"
							class:tab-active={filterState === 'incomplete'}
							onclick={() => (filterState = 'incomplete')}
						>
							{m.filterIncomplete()} ({data.flags.filter((f) => !f.isComplete).length})
						</button>
						<button
							class="tab"
							class:tab-active={filterState === 'unlocked'}
							onclick={() => (filterState = 'unlocked')}
						>
							{m.filterUnlocked()} ({data.flags.filter((f) =>
								f.pieces.some((p) => p.state === 'UNLOCKED')
							).length})
						</button>
						<button
							class="tab"
							class:tab-active={filterState === 'complete'}
							onclick={() => (filterState = 'complete')}
						>
							{m.filterComplete()} ({data.flags.filter((f) => f.isComplete).length})
						</button>
					</div>
				</div>

				<!-- Flags Grid -->
				{#if filteredFlags.length > 0}
					<div
						class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
					>
						{#each filteredFlags as flag (flag.id)}
							<FlagCard {flag} />
						{/each}
					</div>
				{:else}
					<div class="alert alert-info">
						<i class="fa-solid fa-info-circle"></i>
						<span>{m.noFlagsInFilter()}</span>
					</div>
				{/if}
			{:else}
				<div class="alert alert-info">
					<i class="fa-solid fa-info-circle"></i>
					<span>{m.noFlagsYet()}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
