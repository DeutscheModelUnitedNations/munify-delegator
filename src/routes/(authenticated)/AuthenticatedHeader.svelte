<script lang="ts">
	import { configPublic } from '$config/public';
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import { headerState } from '$lib/services/authenticatedHeaderStatus.svelte';

	//TODO
	// import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	// import SettingsButton from './DataTable/SettingsButton.svelte';

	export const logoutUrlQuery = graphql(`
		query LogoutUrlQuery {
			logoutUrl
		}
	`);
</script>

<div class="w-full p-4">
	<div
		class="no-print navbar mb-4 justify-between gap-0 rounded-2xl bg-base-200 px-4 py-2 shadow-lg sm:gap-2"
	>
		{#if headerState.openNavCallback !== undefined}
			<button
				class="sm:hidden"
				aria-label="Toggle navigation menu"
				on:click={() => {
					if (headerState.openNavCallback) {
						headerState.openNavCallback();
					}
					headerState.openNavCallback = undefined;
				}}
			>
				<i class="fa-duotone fa-bars mr-3 text-xl"></i>
			</button>
		{/if}
		<div>
			{#if headerState.faIcon !== ''}
				<i class="fa-duotone {headerState.faIcon} mr-3 text-xl"></i>
			{/if}
			{#if headerState.label !== ''}
				<h1 class="text-xl font-semibold">{headerState.label}</h1>
			{/if}
		</div>
		<div class="dropdown dropdown-end z-10">
			<div tabindex="-1" class="btn btn-square btn-ghost">
				<i class="fa-duotone fa-user text-xl"></i>
			</div>
			<ul
				tabindex="-1"
				class="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow-2xl"
			>
				<li>
					<a href="/my-account">
						<i class="fa-duotone fa-user w-4"></i>
						{m.profileSettings()}
					</a>
				</li>
				<li>
					<a href={$logoutUrlQuery.data?.logoutUrl}>
						<i class="fa-duotone fa-sign-out w-4"></i>
						{m.logout()}
					</a>
				</li>
				{#if configPublic.PUBLIC_FEEDBACK_URL}
					<li>
						<a href={configPublic.PUBLIC_FEEDBACK_URL} target="_blank">
							<i class="fa-duotone fa-comment w-4"></i>
							{m.feedback()}
						</a>
					</li>
				{/if}
			</ul>
		</div>
	</div>
</div>
