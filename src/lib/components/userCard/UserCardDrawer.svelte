<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { m } from '$lib/paraglide/messages';
	import {
		createUserCardParams,
		registerUserCardParams,
		getUserCardState,
		closeUserCard
	} from './userCardState.svelte';
	import SlidePanel from '$lib/components/SlidePanel.svelte';
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

<SlidePanel
	bind:open={() => cardState.isOpen, handleOpenChange}
	direction="bottom"
	class="h-[90vh] max-w-7xl rounded-t-box shadow-2xl"
>
	<div class="bg-base-300 mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full"></div>
	<Dialog.Close
		class="btn btn-soft btn-sm btn-square absolute top-4 right-4 z-10"
		aria-label="Close"
	>
		<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
	</Dialog.Close>
	<Dialog.Title class="sr-only">{m.adminUserCard()}</Dialog.Title>
	{#if shown}
		<UserCardContent userId={shown.userId} conferenceId={shown.conferenceId} mode="drawer" />
	{/if}
</SlidePanel>
