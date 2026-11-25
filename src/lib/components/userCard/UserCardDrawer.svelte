<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import {
		createUserCardParams,
		registerUserCardParams,
		getUserCardState,
		closeUserCard
	} from './userCardState.svelte';
	import SlidePanel from '#lib/components/SlidePanel.svelte';
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

<!-- The whole screen on a phone, as wide as the app elsewhere -->
<SlidePanel
	bind:open={() => cardState.isOpen, handleOpenChange}
	direction="bottom"
	class="h-dvh max-w-[1800px] shadow-2xl md:h-[96dvh]"
>
	<!-- The close button comes first, so opening the card puts the focus on it -->
	<div class="absolute top-4 right-4 z-20 flex flex-row-reverse gap-1">
		<Dialog.Close class="btn btn-ghost btn-sm btn-square text-lg" aria-label={m.close()}>
			<i aria-hidden="true" class="ph-duotone ph-x"></i>
		</Dialog.Close>
		{#if shown}
			<a
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/user/[userId]', shown)}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-ghost btn-sm btn-square text-lg"
				aria-label={m.userCardOpenFullPage()}
				title={m.userCardOpenFullPage()}
			>
				<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
			</a>
		{/if}
	</div>
	<Dialog.Title class="sr-only">{m.adminUserCard()}</Dialog.Title>
	{#if shown}
		<UserCardContent userId={shown.userId} conferenceId={shown.conferenceId} mode="drawer" />
	{/if}
</SlidePanel>
