<script lang="ts">
	import NavButton from '$lib/components/NavButton.svelte';
	import NavButtonDropdown from '$lib/components/NavButtonDropdown.svelte';
	import { page } from '$app/stores';

	interface Props {
		activeConferences: any[];
		pastConferences: any[];
	}

	let { activeConferences, pastConferences }: Props = $props();

	let path = $derived($page.url.pathname);
</script>

<div class="drawer min-h-screen bg-base-100 lg:drawer-open">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" />
	<main class="drawer-content p-4 lg:p-10">
		<slot />
	</main>
	<aside class="drawer-side z-10 lg:drawer-open">
		<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<!-- sidebar menu -->
		<nav class="flex min-h-screen w-72 flex-col gap-2 overflow-y-auto bg-slate-100 px-6 py-10">
			<div class="mx-4 flex flex-col justify-center">
				<i class="fa-duotone fa-globe mb-4 text-3xl" />
				<div class="text-md font-black font-normal">MUNify</div>
				<div class="text-2xl font-black font-bold">DELEGATOR</div>
			</div>
			<ul class="menu">
				<NavButton
					href="/dashboard"
					icon="fa-house"
					titel="Übersicht"
					active={path.endsWith('dashboard')}
				></NavButton>

				<div class="h-6" />

				{#each activeConferences as { id, name }}
					<NavButton href="/dashboard/{id}" icon="fa-flag" titel={name} active={path.includes(id)}
					></NavButton>
				{/each}

				<div class="h-6" />

				{#if pastConferences.length > 0}
					<NavButtonDropdown icon="fa-archive" titel="Vergangene">
						{#each pastConferences as { id, name }}
							<NavButton
								href="/dashboard/{id}"
								icon="fa-flag"
								titel={name}
								active={path.includes(id)}
							></NavButton>
						{/each}
					</NavButtonDropdown>
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
