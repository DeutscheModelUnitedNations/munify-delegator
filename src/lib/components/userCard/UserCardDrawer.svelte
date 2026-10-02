<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import { m } from '$lib/paraglide/messages';
	import { getUserCardState, closeUserCard, openUserCard } from './userCardState.svelte';
	import UserCardContent from './UserCardContent.svelte';
	import { queryParameters } from 'sveltekit-search-params';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const cardState = getUserCardState();
	const params = queryParameters({ userCard: true });

	// Guard to prevent URL→State effect from re-opening during close.
	// params.userCard is only cleared by the State -> URL effect below (and the URL
	// itself only changes once goto() resolves), so it still holds the old value
	// when closeUserCard() synchronously updates state.
	let closing = $state(false);

	// URL -> State sync: if page loads with ?userCard=xxx, open the drawer
	$effect(() => {
		if (params.userCard && !cardState.isOpen && !closing) {
			openUserCard(params.userCard, conferenceId);
		}
	});

	// State -> URL sync
	$effect(() => {
		if (cardState.isOpen && cardState.userId) {
			params.userCard = cardState.userId;
		} else if (!cardState.isOpen) {
			params.userCard = null;
		}
	});

	// Reset closing guard once the URL param has actually been cleared
	$effect(() => {
		if (closing && !params.userCard) {
			closing = false;
		}
	});

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			closing = true;
			closeUserCard();
		}
	};
</script>

<Drawer.Root direction="bottom" open={cardState.isOpen} onOpenChange={handleOpenChange}>
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
		<Drawer.Content
			class="bg-base-100 fixed inset-x-0 max-w-7xl mx-auto bottom-0 z-50 flex h-[90vh] flex-col rounded-t-2xl shadow-2xl"
		>
			<div class="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-base-300"></div>
			<Drawer.Close
				class="btn btn-soft btn-sm btn-square absolute top-4 right-4 z-10"
				aria-label="Close"
			>
				<i class="fa-solid fa-xmark"></i>
			</Drawer.Close>
			<Drawer.Title class="sr-only">{m.adminUserCard()}</Drawer.Title>
			{#if cardState.userId && cardState.conferenceId}
				<UserCardContent
					userId={cardState.userId}
					conferenceId={cardState.conferenceId}
					mode="drawer"
				/>
			{/if}
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
