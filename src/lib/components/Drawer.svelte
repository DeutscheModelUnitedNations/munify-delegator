<script lang="ts">
	import type { Snippet } from 'svelte';
	import DrawerHeader from './DrawerHeader.svelte';

	interface Props {
		open: boolean;
		category: string;
		title?: string;
		titleSnippet?: Snippet;
		id?: string;
		loading: boolean;
		onClose?: () => void;
		children: Snippet;
		width?: string;
	}

	let {
		open = $bindable(),
		loading,
		onClose,
		children,
		width = '34rem',
		id,
		title,
		titleSnippet,
		category
	}: Props = $props();

	function close() {
		document.body.classList.remove('overflow-hidden');
		open = false;
		if (onClose) onClose();
	}

	$effect(() => {
		if (open) {
			document.body.classList.add('overflow-hidden');
		}
	});
</script>

{#if open}
	<div
		aria-hidden="true"
		onclick={close}
		class="fixed left-0 top-0 z-30 h-screen w-screen bg-black opacity-30"
	></div>
	<div
		class="no-scrollbar fixed right-0 top-0 z-40 h-screen overflow-y-auto duration-300"
		style="width: {width}"
	>
		<div class="flex min-h-full flex-col gap-8 bg-base-100 p-10">
			<DrawerHeader {id} {title} {titleSnippet} {category} {loading} />
			{#if loading}
				<div class="flex w-full items-center justify-center">
					<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
				</div>
			{:else}
				{@render children()}
			{/if}
			<button class="btn absolute right-4 top-4" onclick={close} aria-label="Close">
				<i class="fa-duotone fa-xmark"></i>
			</button>
		</div>
	</div>
{/if}

<style lang="postcss">
	/* Hide scrollbar for Chrome, Safari and Opera */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	.no-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
