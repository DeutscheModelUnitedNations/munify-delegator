<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { Drawer } from 'vaul-svelte';
	import type { DrawerDirection } from 'vaul-svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { getRecipientDisplayName, type Recipient, type RecipientGroup } from './recipientUtils';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		groups: RecipientGroup[];
		selected: Recipient | null;
		loadError?: string;
	}

	let { groups, selected = $bindable(), loadError = '' }: Props = $props();

	let drawerOpen = $state(false);
	let drawerStep = $state<'group' | 'recipient'>('group');
	let selectedGroupId = $state('');

	const sortedGroups = $derived(
		[...groups].sort((a, b) => a.groupLabel.localeCompare(b.groupLabel))
	);
	const selectedGroup = $derived(sortedGroups.find((g) => g.groupId === selectedGroupId));
	const sortedRecipients = $derived(
		selectedGroup
			? [...selectedGroup.recipients].sort((a, b) =>
					getRecipientDisplayName(a).localeCompare(getRecipientDisplayName(b))
				)
			: []
	);

	// Responsive direction: bottom on mobile, right on desktop
	let isMobile = $state(browser ? window.innerWidth < 768 : true);

	$effect(() => {
		if (!browser) return;
		const mql = window.matchMedia('(min-width: 768px)');
		const handler = (e: MediaQueryListEvent) => {
			isMobile = !e.matches;
		};
		isMobile = !mql.matches;
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	let direction: DrawerDirection = $derived(isMobile ? 'bottom' : 'right');

	function getCategoryIcon(category: string): string {
		switch (category) {
			case 'COMMITTEE':
				return 'fa-users';
			case 'NSA':
				return 'fa-building-ngo';
			case 'CUSTOM_ROLE':
				return 'fa-user-tie';
			default:
				return 'fa-users';
		}
	}

	function getCategoryLabel(category: string): string {
		switch (category) {
			case 'COMMITTEE':
				return m.messagingCategoryCommittee();
			case 'NSA':
				return m.messagingCategoryNSA();
			case 'CUSTOM_ROLE':
				return m.messagingCategoryCustomRole();
			default:
				return category;
		}
	}

	function open() {
		drawerStep = 'group';
		selectedGroupId = '';
		drawerOpen = true;
	}

	function selectGroup(groupId: string) {
		selectedGroupId = groupId;
		drawerStep = 'recipient';
	}

	function selectRecipient(recipient: Recipient) {
		selected = recipient;
		drawerOpen = false;
	}

	function backToGroups() {
		drawerStep = 'group';
		selectedGroupId = '';
	}
</script>

<!-- Inline display / trigger -->
{#if selected}
	<div class="flex items-center gap-3">
		<div class="flex items-center gap-2.5 flex-1 min-w-0">
			{#if selected.alpha2Code}
				<Flag size="sm" alpha2Code={selected.alpha2Code.toLowerCase()} />
			{:else if selected.fontAwesomeIcon}
				<Flag size="sm" nsa icon={selected.fontAwesomeIcon} />
			{/if}
			<div class="min-w-0">
				<div class="font-semibold truncate text-lg">
					{getRecipientDisplayName(selected)}
				</div>
				{#if selected.firstName && selected.lastName}
					<div class="text-xs text-base-content/60 truncate">
						{formatNames(selected.firstName, selected.lastName)}
					</div>
				{/if}
			</div>
		</div>
		<button
			type="button"
			class="btn btn-ghost"
			onclick={open}
			aria-label={m.messagingSelectRecipientDrawer()}
		>
			<i class="fa-duotone fa-pen-to-square"></i>
		</button>
	</div>
{:else}
	<button type="button" class="btn btn-outline w-full justify-start gap-2" onclick={open}>
		<i class="fa-duotone fa-user-plus"></i>
		{m.messagingSelectRecipientDrawer()}
	</button>
{/if}

<!-- Drawer -->
{#key direction}
	<Drawer.Root bind:open={drawerOpen} {direction}>
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
			<Drawer.Content
				class="bg-base-100 fixed z-50 flex flex-col outline-none {direction === 'bottom'
					? 'bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl'
					: 'top-0 right-0 bottom-0 w-full sm:max-w-md md:max-w-lg'}"
			>
				<!-- Header -->
				<div
					class="border-b border-base-300 px-5 {direction === 'bottom'
						? 'rounded-t-2xl pt-2 pb-4'
						: 'py-4'}"
				>
					{#if direction === 'bottom'}
						<div class="flex justify-center pb-3 pt-1">
							<div class="bg-base-content/30 h-1.5 w-12 rounded-full"></div>
						</div>
					{/if}
					<div class="flex items-center gap-3">
						{#if drawerStep === 'recipient'}
							<button
								type="button"
								class="btn btn-ghost btn-sm btn-square"
								onclick={backToGroups}
								aria-label={m.messagingBackToGroups()}
							>
								<i class="fa-duotone fa-arrow-left text-lg"></i>
							</button>
						{/if}
						<Drawer.Title class="text-lg font-bold flex-1">
							{#if drawerStep === 'group'}
								{m.messagingSelectRecipientDrawer()}
							{:else if selectedGroup}
								{selectedGroup.groupLabel}
							{/if}
						</Drawer.Title>
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-square"
							onclick={() => (drawerOpen = false)}
							aria-label="Close"
						>
							<i class="fa-solid fa-xmark text-lg"></i>
						</button>
					</div>
				</div>

				<!-- Scrollable content -->
				<div class="flex-1 overflow-y-auto" data-vaul-no-drag>
					{#if drawerStep === 'group'}
						{#if loadError}
							<div class="p-4">
								<div role="alert" class="alert alert-error">
									<i class="fa-duotone fa-circle-exclamation"></i>
									<span>{loadError}</span>
								</div>
							</div>
						{:else if groups.length === 0}
							<div class="p-4">
								<div role="alert" class="alert alert-warning">
									<i class="fa-duotone fa-circle-exclamation"></i>
									<span>{m.messagingNoGroupsAvailable()}</span>
								</div>
							</div>
						{:else}
							<ul class="menu p-2 gap-1 w-full">
								{#each sortedGroups as group}
									<li>
										<button
											type="button"
											class="flex items-center gap-3 w-full"
											onclick={() => selectGroup(group.groupId)}
										>
											<i
												class="fa-duotone {group.fontAwesomeIcon
													? `fa-${group.fontAwesomeIcon.replace('fa-', '')}`
													: getCategoryIcon(
															group.category
														)} text-base-content/60 text-lg w-6 text-center"
											></i>
											<div class="flex-1 min-w-0 text-left">
												<div class="font-semibold truncate">{group.groupLabel}</div>
												<div class="text-xs text-base-content/50">
													{getCategoryLabel(group.category)}
												</div>
											</div>
											<span class="badge badge-sm badge-ghost">
												{group.recipients.length}
											</span>
											<i class="fa-duotone fa-chevron-right text-base-content/40"></i>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					{:else if drawerStep === 'recipient' && selectedGroup}
						{#if selectedGroup.recipients.length === 0}
							<div class="p-4">
								<div role="alert" class="alert alert-warning">
									<i class="fa-duotone fa-circle-exclamation"></i>
									<span>{m.messagingNoRecipientsInGroup()}</span>
								</div>
							</div>
						{:else}
							<ul class="menu p-2 gap-1 w-full">
								{#each sortedRecipients as recipient}
									<li>
										<button
											type="button"
											class="flex items-center gap-3 w-full"
											onclick={() => selectRecipient(recipient)}
										>
											{#if recipient.alpha2Code}
												<Flag size="xs" alpha2Code={recipient.alpha2Code.toLowerCase()} />
											{:else if recipient.fontAwesomeIcon}
												<Flag size="xs" nsa icon={recipient.fontAwesomeIcon} />
											{/if}
											<div class="flex-1 min-w-0 text-left">
												<div class="font-semibold truncate">
													{getRecipientDisplayName(recipient)}
												</div>
												{#if recipient.firstName && recipient.lastName}
													<div class="text-xs text-base-content/50 truncate">
														{formatNames(recipient.firstName, recipient.lastName)}
													</div>
												{/if}
											</div>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/key}
