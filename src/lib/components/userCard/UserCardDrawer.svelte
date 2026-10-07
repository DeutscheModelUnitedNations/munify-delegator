<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { m } from '$lib/paraglide/messages';
	import {
		createUserCardParams,
		registerUserCardParams,
		getUserCardState,
		closeUserCard
	} from './userCardState.svelte';
	import UserCardContent from './UserCardContent.svelte';

	// Mounted once for the whole authenticated area. Whether it is open is read off the URL.
	registerUserCardParams(createUserCardParams());
	const cardState = getUserCardState();

	// The URL loses the ids the instant the card closes. Keep the last ones rendered so the
	// drawer keeps its content while the exit transition plays.
	let shown = $state<{ userId: string; conferenceId: string } | null>(null);
	$effect(() => {
		if (cardState.userId && cardState.conferenceId) {
			shown = { userId: cardState.userId, conferenceId: cardState.conferenceId };
		}
	});

	const handleOpenChange = (open: boolean) => {
		if (!open) closeUserCard();
	};
</script>

<!--
	A bits-ui dialog with Svelte transitions rather than vaul: vaul only animates a close it runs
	itself (its own close button), so overlay clicks and Escape unmounted the drawer instantly and
	a controlled open prop gave it no enter animation either. forceMount hands the unmounting to
	the `{#if}` below, which keeps the node alive until the out transition has finished.
-->
<Dialog.Root open={cardState.isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						class="fixed inset-0 z-40 bg-black/40"
						transition:fade={{ duration: 200 }}
					></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						class="bg-base-100 fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[90vh] max-w-7xl flex-col rounded-t-2xl shadow-2xl outline-none"
						transition:fly={{ y: '100%', duration: 300, easing: cubicOut }}
					>
						<div class="bg-base-300 mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full"></div>
						<Dialog.Close
							class="btn btn-soft btn-sm btn-square absolute top-4 right-4 z-10"
							aria-label="Close"
						>
							<i class="fa-solid fa-xmark"></i>
						</Dialog.Close>
						<Dialog.Title class="sr-only">{m.adminUserCard()}</Dialog.Title>
						{#if shown}
							<UserCardContent
								userId={shown.userId}
								conferenceId={shown.conferenceId}
								mode="drawer"
							/>
						{/if}
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
