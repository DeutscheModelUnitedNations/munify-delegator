<script lang="ts">
	import { resolve } from '$app/paths';
	import { configPublic } from '$config/public';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	/** The header's account dropdown: dashboard, profile, logout and feedback. */

	let logoutUrl = $state<string>();

	$effect(() => {
		void client.query.logoutUrl().then((url) => {
			logoutUrl = String(url);
		});
	});
</script>

<div class="dropdown dropdown-end z-10">
	<div tabindex="-1" class="btn btn-square btn-ghost">
		<i class="fa-duotone fa-user text-xl"></i>
	</div>
	<ul tabindex="-1" class="menu dropdown-content rounded-box bg-base-100 mt-3 w-52 p-2 shadow-2xl">
		<li>
			<a href={resolve('/dashboard')}>
				<i class="fa-duotone fa-grid-2 w-4"></i>
				{m.dashboard()}
			</a>
		</li>
		<li>
			<a href={resolve('/my-account')}>
				<i class="fa-duotone fa-user w-4"></i>
				{m.profileSettings()}
			</a>
		</li>
		<li>
			<a class={logoutUrl ? '' : 'disabled'} href={logoutUrl} rel="external">
				<i class="fa-duotone fa-sign-out w-4"></i>
				{m.logout()}
			</a>
		</li>
		{#if configPublic.PUBLIC_FEEDBACK_URL}
			<li>
				<a href={configPublic.PUBLIC_FEEDBACK_URL} target="_blank" rel="external">
					<i class="fa-duotone fa-comment w-4"></i>
					{m.feedback()}
				</a>
			</li>
		{/if}
	</ul>
</div>
