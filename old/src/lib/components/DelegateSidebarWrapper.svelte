<script lang="ts">
	import NavButton from '$lib/components/NavButton.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import type { ConferencePlain } from '$db/generated/schema/Conference';
	import type { Conference } from '@prisma/client';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		conferences: any[];
		children: Snippet;
	}

	//TODO we COULD access the data like this https://kit.svelte.dev/docs/load#$page-data
	// not sure if this makes sense since components should be dumb and testable and not rely on global stores maybe?
	let { conferences, children }: Props = $props();

	let preConferences = $derived(conferences.filter((c) => c.status === 'PRE'));
	let activeConferences = $derived(conferences.filter((c) => c.status === 'ACTIVE'));
	let pastConferences = $derived(conferences.filter((c) => c.status === 'POST'));

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
				<div class="font-[#000] text-2xl font-bold">DELEGATOR</div>
			</div>
			<ul class="menu">
				{#if conferences.length > 1}
					<NavButton
						href="/dashboard"
						icon="fa-house"
						title="Übersicht"
						active={path.endsWith('dashboard')}
					></NavButton>
				{/if}

				{#if activeConferences.length > 0}
					<div class="h-6"></div>
					<p class="pb-2 text-xs text-gray-500">{m.activeConferences()}</p>
					{#each activeConferences as { id, title }}
						<NavButton
							href="/dashboard/{id}"
							icon="fa-flag"
							title={title ?? ''}
							active={path.includes(id)}
						></NavButton>
					{/each}
				{/if}

				{#if preConferences.length > 0}
					<div class="h-6"></div>
					<p class="pb-2 text-xs text-gray-500">{m.upcomingConferences()}</p>
					{#each preConferences as { id, title }}
						<NavButton
							href="/dashboard/{id}"
							icon="fa-flag"
							title={title ?? ''}
							active={path.includes(id)}
						></NavButton>
					{/each}
				{/if}

				{#if pastConferences.length > 0}
					<div class="h-6"></div>
					<p class="pb-2 text-xs text-gray-500">{m.pastConferences()}</p>
					{#each pastConferences as { id, title }}
						<NavButton
							href="/dashboard/{id}"
							icon="fa-flag"
							title={title ?? ''}
							active={path.includes(id)}
						></NavButton>
					{/each}
				{/if}

				<div class="h-6"></div>

				<NavButton href="/registration" icon="fa-plus" title={m.signup()}></NavButton>
				<NavButton href="/" icon="fa-house" title={m.home()}></NavButton>
			</ul>
		</nav>
		<!-- /sidebar menu -->
	</aside>
</div>

<style lang="postcss">
	i {
		@apply w-4;
	}
</style>
