<script lang="ts">
	import { goto } from '$app/navigation';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import Fuse from 'fuse.js';
	import hotkeys from 'hotkeys-js';
	import {
		getCommandPaletteState,
		closeCommandPalette,
		toggleCommandPalette
	} from './commandPaletteState.svelte';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';
	import { getAllPages, getConfigEntries, type PageEntry, type ConfigEntry } from './pageRegistry';
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

	// Server search (users + delegations)
	const searchQuery = graphql(`
		query SearchConference($conferenceId: String!, $searchTerm: String!) {
			searchConference(conferenceId: $conferenceId, searchTerm: $searchTerm) {
				users {
					id
					email
					given_name
					family_name
					participationType
				}
				delegations {
					id
					school
					entryCode
					memberCount
					assignedNationAlpha3Code
					assignedNonStateActorName
					headDelegateUserId
				}
			}
		}
	`);

	let userResults = $state<
		{
			id: string;
			email: string;
			given_name: string;
			family_name: string;
			participationType: string;
		}[]
	>([]);
	let delegationResults = $state<
		{
			id: string;
			school: string | null;
			entryCode: string;
			memberCount: number;
			assignedNationAlpha3Code: string | null;
			assignedNonStateActorName: string | null;
			headDelegateUserId: string | null;
		}[]
	>([]);

	// Combined flat list for keyboard navigation
	type ResultItem =
		| { type: 'page'; data: PageEntry }
		| {
				type: 'user';
				data: {
					id: string;
					given_name: string;
					family_name: string;
					email: string;
					participationType: string;
				};
		  }
		| {
				type: 'delegation';
				data: {
					id: string;
					school: string | null;
					entryCode: string;
					memberCount: number;
					assignedNationAlpha3Code: string | null;
					assignedNonStateActorName: string | null;
					headDelegateUserId: string | null;
				};
		  }
		| { type: 'config'; data: ConfigEntry };

	// Order: users, delegations, pages, config
	let flatList = $derived.by((): ResultItem[] => {
		const items: ResultItem[] = [];
		for (const u of userResults) items.push({ type: 'user', data: u });
		for (const d of delegationResults) items.push({ type: 'delegation', data: d });
		for (const p of pageResults) items.push({ type: 'page', data: p });
		for (const c of configResults) items.push({ type: 'config', data: c });
		return items;
	});

	// Debounced server search — called from oninput handler, not from $effect
	function triggerServerSearch(term: string) {
		if (debounceTimer) clearTimeout(debounceTimer);

		if (term.trim().length < 2) {
			userResults = [];
			delegationResults = [];
			searchLoading = false;
			activeIndex = 0;
			return;
		}

		searchLoading = true;
		debounceTimer = setTimeout(async () => {
			const result = await searchQuery.fetch({
				variables: { conferenceId, searchTerm: term.trim() }
			});
			if (result.data?.searchConference) {
				userResults = result.data.searchConference.users;
				delegationResults = result.data.searchConference.delegations;
			}
			searchLoading = false;
			activeIndex = 0;
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
				delegationResults = [];
				activeIndex = 0;
			});
		}
	});

	function selectItem(item: ResultItem) {
		closeCommandPalette();
		switch (item.type) {
			case 'page':
				goto(item.data.href);
				break;
			case 'user':
				openUserCard(item.data.id, conferenceId);
				break;
			case 'delegation':
				if (item.data.headDelegateUserId) {
					openUserCard(item.data.headDelegateUserId, conferenceId);
				} else {
					goto(`/management/${conferenceId}/delegations?filter=${item.data.entryCode}`);
				}
				break;
			case 'config':
				goto(`/management/${conferenceId}/configuration?tab=${item.data.tab}`);
				break;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, flatList.length - 1);
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
			scrollActiveIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (flatList[activeIndex]) {
				selectItem(flatList[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeCommandPalette();
		}
	}

	function scrollActiveIntoView() {
		tick().then(() => {
			const el = document.querySelector('[data-command-palette-active="true"]');
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	function getParticipationTypeLabel(type: string): string {
		switch (type) {
			case 'delegation':
				return m.delegationMember();
			case 'single':
				return m.singleParticipant();
			case 'supervisor':
				return m.supervisor();
			case 'team':
				return m.teamMember();
			default:
				return type;
		}
	}

	// Track the global index for each item to determine active state
	// Order: users, delegations, pages, config
	function getGlobalIndex(
		type: 'user' | 'delegation' | 'page' | 'config',
		localIndex: number
	): number {
		if (type === 'user') return localIndex;
		if (type === 'delegation') return userResults.length + localIndex;
		if (type === 'page') return userResults.length + delegationResults.length + localIndex;
		return userResults.length + delegationResults.length + pageResults.length + localIndex;
	}

	// Hotkeys registration
	const previousFilter = hotkeys.filter;
	onMount(() => {
		// Allow hotkeys to fire even inside input/textarea/select
		hotkeys.filter = () => true;
		hotkeys('ctrl+k, command+k', (e) => {
			e.preventDefault();
			toggleCommandPalette();
		});
	});

	onDestroy(() => {
		hotkeys.unbind('ctrl+k, command+k');
		hotkeys.filter = previousFilter;
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

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
				<i class="fa-duotone fa-magnifying-glass text-base-content/40"></i>
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
				{#if userResults.length > 0}
					<CommandPaletteResultGroup
						title={m.commandPaletteUsers()}
						icon="fa-users"
						loading={searchLoading}
					>
						{#each userResults as user, i (user.id)}
							{@const idx = getGlobalIndex('user', i)}
							<div data-command-palette-active={idx === activeIndex}>
								<CommandPaletteItem
									icon="fa-user"
									primary="{user.given_name} {user.family_name}"
									secondary="{user.email} · {getParticipationTypeLabel(user.participationType)}"
									active={idx === activeIndex}
									onclick={() => selectItem({ type: 'user', data: user })}
								/>
							</div>
						{/each}
					</CommandPaletteResultGroup>
				{:else if searchLoading && searchInput.trim().length >= 2}
					<CommandPaletteResultGroup title={m.commandPaletteUsers()} icon="fa-users" loading={true}>
						<div class="px-3 py-2 text-sm text-base-content/40"></div>
					</CommandPaletteResultGroup>
				{/if}

				{#if delegationResults.length > 0}
					<CommandPaletteResultGroup
						title={m.commandPaletteDelegations()}
						icon="fa-users-viewfinder"
						loading={searchLoading}
					>
						{#each delegationResults as delegation, i (delegation.id)}
							{@const idx = getGlobalIndex('delegation', i)}
							<div data-command-palette-active={idx === activeIndex}>
								<CommandPaletteItem
									icon="fa-users-viewfinder"
									primary={delegation.school ?? delegation.entryCode}
									secondary="{delegation.entryCode} · {delegation.memberCount} {m.members()}"
									active={idx === activeIndex}
									onclick={() => selectItem({ type: 'delegation', data: delegation })}
								/>
							</div>
						{/each}
					</CommandPaletteResultGroup>
				{/if}

				{#if pageResults.length > 0}
					<CommandPaletteResultGroup title={m.commandPalettePages()} icon="fa-file">
						{#each pageResults as page, i (page.id)}
							{@const idx = getGlobalIndex('page', i)}
							<div data-command-palette-active={idx === activeIndex}>
								<CommandPaletteItem
									icon={page.icon}
									primary={page.title()}
									active={idx === activeIndex}
									onclick={() => selectItem({ type: 'page', data: page })}
								/>
							</div>
						{/each}
					</CommandPaletteResultGroup>
				{/if}

				{#if configResults.length > 0}
					<CommandPaletteResultGroup title={m.commandPaletteConfiguration()} icon="fa-gears">
						{#each configResults as config, i (config.id)}
							{@const idx = getGlobalIndex('config', i)}
							<div data-command-palette-active={idx === activeIndex}>
								<CommandPaletteItem
									icon={config.icon}
									primary={config.title()}
									secondary={config.section()}
									active={idx === activeIndex}
									onclick={() => selectItem({ type: 'config', data: config })}
								/>
							</div>
						{/each}
					</CommandPaletteResultGroup>
				{/if}

				{#if flatList.length === 0 && searchInput.trim().length >= 2 && !searchLoading}
					<div class="px-4 py-8 text-center text-sm text-base-content/40">
						{m.commandPaletteNoResults()}
					</div>
				{/if}

				{#if searchInput.trim().length > 0 && searchInput.trim().length < 2}
					<div class="px-4 py-8 text-center text-sm text-base-content/40">
						{m.commandPaletteMinChars()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
