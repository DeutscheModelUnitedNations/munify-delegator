<script lang="ts">
	import NavButton from '$lib/components/NavButton.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		activeConferences: any[];
		pastConferences: any[];
		children: Snippet;
	}

	//TODO we COULD access the data like this https://kit.svelte.dev/docs/load#$page-data
	// not sure if this makes sense since components should be dumb and testable and not rely on global stores maybe?
	let { activeConferences, pastConferences, children }: Props = $props();

	let path = $derived($page.url.pathname);
</script>

<div class="drawer min-h-screen bg-base-100 lg:drawer-open">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" />
	<main class="drawer-content p-4 lg:p-10">
		{@render children()}
	</main>
	<aside class="drawer-side z-10 lg:drawer-open">
		<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<!-- sidebar menu -->
		<nav class="flex min-h-screen w-72 flex-col gap-2 overflow-y-auto bg-base-200 px-6 py-10">
			<div class="mx-4 flex flex-col justify-center">
				<i class="fa-duotone fa-id-card-clip mb-4 text-3xl"></i>
				<div class="text-md font-[#000] font-normal">MUNify</div>
				<div class="text-2xl font-[#000] font-bold">DELEGATOR</div>
			</div>
			<ul class="menu">
				<NavButton
					href="/dashboard"
					icon="fa-house"
					titel="Übersicht"
					active={path.endsWith('dashboard')}
				></NavButton>

				<div class="h-6" />

				{#if activeConferences.length > 0}
					<p class="text-xs text-gray-500 pb-2">Aktive Konferenzen</p>
					{#each activeConferences as { id, name }}
						<NavButton href="/dashboard/{id}" icon="fa-flag" titel={name} active={path.includes(id)}
						></NavButton>
					{/each}
				{/if}

				<div class="h-6" />

				{#if pastConferences.length > 0}
					<p class="text-xs text-gray-500 pb-2">Vergangene Konferenzen</p>
					{#each pastConferences as { id, name }}
						<NavButton href="/dashboard/{id}" icon="fa-flag" titel={name} active={path.includes(id)}
						></NavButton>
					{/each}
				{/if}

				<div class="h-6" />

				<NavButton href="/registration" icon="fa-plus" titel="Anmeldung"></NavButton>
			</ul>
		</nav>
		<!-- /sidebar menu -->
	</aside>
</div>

<style>
	i {
		@apply w-4;
	}
</style>
