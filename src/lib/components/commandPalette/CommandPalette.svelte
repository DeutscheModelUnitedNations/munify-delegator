<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { onDestroy, tick, untrack } from 'svelte';
	import Fuse from 'fuse.js';
	import {
		getCommandPaletteState,
		closeCommandPalette,
		toggleCommandPalette
	} from './commandPaletteState.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { getAllPages, getConfigEntries, type PageEntry, type ConfigEntry } from './pageRegistry';
	import {
		describeItem,
		flattenResults,
		resultTarget,
		searchHint,
		steppedIndex,
		type ResultItem
	} from './commandPaletteItems';
	import { searchConference } from './commandPaletteSearch';
	import CommandPaletteItem from './CommandPaletteItem.svelte';
	import CommandPaletteResultGroup from './CommandPaletteResultGroup.svelte';
	import Kbd from '$lib/components/Kbd.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const paletteState = getCommandPaletteState();

	let searchInput = $state('');
	let activeIndex = $state(0);
	let searchLoading = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Page search (client-side with Fuse.js)
	const pages = $derived(getAllPages(conferenceId));
	const fuse = $derived(
		new Fuse(pages, {
			keys: [
				{ name: 'title', getFn: (item: PageEntry) => item.title(), weight: 2 },
				{ name: 'keywords', weight: 1 }
			],
			threshold: 0.4
		})
	);

	let pageResults = $derived.by(() => {
		if (!searchInput.trim()) {
			// Show top 5 pages as quick navigation
			return pages.slice(0, 5);
		}
		return fuse.search(searchInput).map((r) => r.item);
	});

	// Configuration search (client-side with Fuse.js)
	const configEntries = getConfigEntries();
	const configFuse = new Fuse(configEntries, {
		keys: [
			{ name: 'title', getFn: (item: ConfigEntry) => item.title(), weight: 2 },
			{ name: 'section', getFn: (item: ConfigEntry) => item.section(), weight: 1.5 },
			{ name: 'keywords', weight: 1 }
		],
		threshold: 0.4
	});

	let configResults = $derived.by(() => {
		if (!searchInput.trim()) return [];
		return configFuse.search(searchInput).map((r) => r.item);
	});

	type SearchResults = Awaited<ReturnType<typeof searchConference>>;

	let userResults = $state<SearchResults['users']>([]);
	let delegationResults = $state<SearchResults['delegations']>([]);
	let foreignUserResults = $state<SearchResults['foreignUsers']>([]);
	let transactionResults = $state<SearchResults['transactions']>([]);
	let seatResults = $state<SearchResults['seats']>([]);
	let committeeResults = $state<SearchResults['committees']>([]);

	// Combined flat list for keyboard navigation
	let flatList = $derived(
		flattenResults({
			users: userResults,
			delegations: delegationResults,
			seats: seatResults,
			committees: committeeResults,
			transactions: transactionResults,
			pages: pageResults,
			configs: configResults,
			foreignUsers: foreignUserResults
		})
	);

	// Debounced server search — called from oninput handler, not from $effect
	function triggerServerSearch(term: string) {
		if (debounceTimer) clearTimeout(debounceTimer);

		if (term.trim().length < 2) {
			userResults = [];
			delegationResults = [];
			transactionResults = [];
			seatResults = [];
			committeeResults = [];
			foreignUserResults = [];
			searchLoading = false;
			activeIndex = 0;
			return;
		}

		searchLoading = true;
		debounceTimer = setTimeout(async () => {
			try {
				const result = await searchConference(conferenceId, term);
				userResults = result.users;
				delegationResults = result.delegations;
				foreignUserResults = result.foreignUsers;
				transactionResults = result.transactions;
				seatResults = result.seats;
				committeeResults = result.committees;
			} finally {
				searchLoading = false;
				activeIndex = 0;
			}
		}, 300);
	}

	function handleInput() {
		triggerServerSearch(searchInput);
	}

	// Focus input when opened, reset state when closed
	$effect(() => {
		if (paletteState.isOpen) {
			tick().then(() => inputEl?.focus());
		} else {
			untrack(() => {
				searchInput = '';
				userResults = [];
				transactionResults = [];
				seatResults = [];
				committeeResults = [];
				delegationResults = [];
				foreignUserResults = [];
				activeIndex = 0;
				searchLoading = false;
			});
		}
	});

	function selectItem(item: ResultItem) {
		closeCommandPalette();
		const target = resultTarget(item, conferenceId);
		if ('userId' in target) openUserCard(target.userId);
		else goto(target.href);
	}

	function selectActive() {
		const item = flatList[activeIndex];
		if (item) selectItem(item);
	}

	function moveActive(index: number | undefined) {
		if (index === undefined) return;
		activeIndex = index;
		scrollActiveIntoView();
	}

	const handledKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'];

	function handleKeydown(e: KeyboardEvent) {
		if (!handledKeys.includes(e.key)) return;
		e.preventDefault();
		if (e.key === 'Escape') closeCommandPalette();
		else if (e.key === 'Enter') selectActive();
		else moveActive(steppedIndex(e.key, activeIndex, flatList.length));
	}

	function scrollActiveIntoView() {
		tick().then(() => {
			const el = document.querySelector('[data-command-palette-active="true"]');
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	/** The heading of each result group; server-searched groups show the spinner while searching. */
	const groupHeadings: Record<
		ResultItem['type'],
		{ title: () => string; icon: string; fromServer: boolean }
	> = {
		user: { title: m.commandPaletteUsers, icon: 'fa-users', fromServer: true },
		delegation: {
			title: m.commandPaletteDelegations,
			icon: 'fa-users-viewfinder',
			fromServer: true
		},
		seat: { title: m.seats, icon: 'fa-chair', fromServer: true },
		committee: { title: m.committees, icon: 'fa-podium', fromServer: true },
		transaction: { title: m.payment, icon: 'fa-money-bill-transfer', fromServer: true },
		page: { title: m.commandPalettePages, icon: 'fa-file', fromServer: false },
		config: { title: m.commandPaletteConfiguration, icon: 'fa-gears', fromServer: false },
		foreignUser: { title: m.commandPaletteForeignUsers, icon: 'fa-user-xmark', fromServer: false }
	};

	/** `flatList` cut into its groups, each item with its index in the flat list. */
	let groups = $derived.by(() => {
		const result: {
			type: ResultItem['type'];
			items: { item: ResultItem; index: number }[];
		}[] = [];
		flatList.forEach((item, index) => {
			const last = result.at(-1);
			if (last?.type === item.type) last.items.push({ item, index });
			else result.push({ type: item.type, items: [{ item, index }] });
		});
		return result;
	});

	const searchTerm = $derived(searchInput.trim());

	/** The note under the results: too short a term, or nothing found for a long enough one. */
	const hint = $derived(searchHint(searchTerm, flatList.length, searchLoading));

	// Global Ctrl+K / Cmd+K shortcut via native listener for reliability
	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			e.stopPropagation();
			toggleCommandPalette();
		}
	}

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

<svelte:document onkeydowncapture={handleGlobalKeydown} />

{#if paletteState.isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex justify-center bg-black/40"
		onkeydown={handleKeydown}
		onclick={() => closeCommandPalette()}
	>
		<!-- Panel -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="border-base-300 bg-base-100 rounded-box mt-[15vh] h-fit w-full max-w-xl border shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Search input -->
			<div class="border-base-300 flex items-center gap-3 border-b px-4 py-3">
				<i class="fa-sharp-duotone fa-solid fa-magnifying-glass text-base-content/40"></i>
				<input
					bind:this={inputEl}
					bind:value={searchInput}
					oninput={handleInput}
					type="text"
					class="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
					placeholder={m.commandPalettePlaceholder()}
				/>
				<Kbd hotkey="Esc" size="xs" />
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto p-1" role="listbox">
				{#if userResults.length === 0 && searchLoading && searchTerm.length >= 2}
					<CommandPaletteResultGroup title={m.commandPaletteUsers()} icon="fa-users" loading={true}>
						<div class="px-3 py-2 text-sm text-base-content/40"></div>
					</CommandPaletteResultGroup>
				{/if}

				{#each groups as group (group.type)}
					{@const heading = groupHeadings[group.type]}
					<CommandPaletteResultGroup
						title={heading.title()}
						icon={heading.icon}
						loading={heading.fromServer && searchLoading}
					>
						{#each group.items as { item, index } (item.data.id)}
							<div data-command-palette-active={index === activeIndex}>
								<CommandPaletteItem
									{...describeItem(item)}
									active={index === activeIndex}
									onclick={() => selectItem(item)}
								/>
							</div>
						{/each}
					</CommandPaletteResultGroup>
				{/each}

				{#if hint}
					<div class="px-4 py-8 text-center text-sm text-base-content/40">
						{hint}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
