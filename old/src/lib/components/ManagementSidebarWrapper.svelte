<script lang="ts">
	import NavButton from '$lib/components/NavButton.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages';

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
	<main class="drawer-content h-screen overflow-y-auto p-4 lg:p-10 print:overflow-y-visible">
		{@render children()}
	</main>
	<aside class="no-print drawer-side z-10 lg:drawer-open">
		<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<!-- sidebar menu -->
		<nav
			class="no-print flex min-h-screen w-72 flex-col gap-2 overflow-y-auto bg-base-200 px-6 py-10"
		>
			<div class="mx-4 flex flex-col justify-center">
				<i class="fa-duotone fa-id-card-clip mb-4 text-3xl"></i>
				<div class="text-md font-normal">MUNify</div>
				<div class="text-2xl font-bold">DELEGATOR</div>
				<div class="text-md font-normal">{m.administrator()}</div>
			</div>
			<ul class="menu">
				<NavButton
					href="/management/{conferenceId}/stats"
					icon="fa-chart-pie"
					title={m.adminStats()}
					active={path.endsWith('stats')}
				></NavButton>
				<NavButton
					href="/management/{conferenceId}/configuration"
					icon="fa-gears"
					title={m.adminSettings()}
					active={path.endsWith('configuration')}
				></NavButton>

				<NavMenuDetails></NavMenuDetails>

				<li>
					<details>
						<summary>
							<i class="fa-duotone fa-database w-5 text-center"></i>
							<span>{m.tables()}</span>
						</summary>
						<ul>
							<NavButton
								href="/management/{conferenceId}/participants"
								icon="fa-users"
								title={m.adminUsers()}
								active={path.endsWith('participants')}
							></NavButton>

							<NavButton
								href="/management/{conferenceId}/delegations"
								icon="fa-users-viewfinder"
								title={m.adminDelegations()}
								active={path.endsWith('delegations')}
							></NavButton>

							<NavButton
								href="/management/{conferenceId}/individuals"
								icon="fa-user"
								title={m.adminSingleParticipants()}
								active={path.endsWith('individuals')}
							></NavButton>

							<NavButton
								href="/management/{conferenceId}/supervisors"
								icon="fa-chalkboard-user"
								title={m.adminSupervisors()}
								active={path.endsWith('supervisors')}
							></NavButton>
						</ul>
					</details>
				</li>
				<li>
					<details>
						<summary>
							<i class="fa-duotone fa-wrench w-5 text-center"></i>
							<span>{m.tools()}</span>
						</summary>
						<ul>
							<NavButton
								href="/management/{conferenceId}/plausibility"
								icon="fa-shield-check"
								title={m.adminPlausibility()}
								active={path.endsWith('plausibility')}
							></NavButton>
						</ul>
					</details>
				</li>

				<div class="h-6"></div>

				<NavButton href="/management" icon="fa-arrow-left" title={m.adminConferenceSelection()}
				></NavButton>
				<NavButton href="/" icon="fa-home" title={m.home()}></NavButton>
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
