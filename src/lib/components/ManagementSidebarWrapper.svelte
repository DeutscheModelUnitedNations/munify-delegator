<script lang="ts">
	import NavButton from '$lib/components/NavButton.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		conferenceId: string;
	}

	//TODO we COULD access the data like this https://kit.svelte.dev/docs/load#$page-data
	// not sure if this makes sense since components should be dumb and testable and not rely on global stores maybe?
	let { children, conferenceId }: Props = $props();

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
				<div class="text-md font-normal">MUNify</div>
				<div class="text-2xl font-bold">DELEGATOR</div>
				<div class="text-md font-normal">Admintools</div>
			</div>
			<ul class="menu">
				<NavButton
					href="/management/{conferenceId}/configuration"
					icon="fa-gears"
					titel="Einstellungen"
					active={path.endsWith('configuration')}
				></NavButton>

				<div class="h-6" />

				<NavButton
					href="/management/{conferenceId}/participants"
					icon="fa-users"
					titel="Teilnehmende"
					active={path.endsWith('participants')}
				></NavButton>

				<NavButton
					href="/management/{conferenceId}/delegations"
					icon="fa-users-viewfinder"
					titel="Delegationen"
					active={path.endsWith('delegations')}
				></NavButton>

				<NavButton
					href="/management/{conferenceId}/individuals"
					icon="fa-user"
					titel="Einzelteilnehmer"
					active={path.endsWith('individuals')}
				></NavButton>
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
