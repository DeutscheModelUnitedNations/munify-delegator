<script lang="ts">
	import { resolve } from '$app/paths';
	import { configPublic } from '$config/public';
	import { client } from '$lib/api/rumbleClient/client';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { m } from '$lib/paraglide/messages';

	/** The header's account menu: who is signed in, the account, language, feedback and logout. */

	const user = await getCurrentUser();

	const displayName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
	const initials =
		`${user.given_name?.[0] ?? ''}${user.family_name?.[0] ?? ''}`.toUpperCase() ||
		(user.email?.[0] ?? '?').toUpperCase();

	let logoutUrl = $state<string>();

	$effect(() => {
		void client.query.logoutUrl().then((url) => {
			logoutUrl = String(url);
		});
	});
</script>

<div class="dropdown dropdown-end z-30">
	<div
		tabindex="0"
		role="button"
		aria-label={displayName || user.email}
		class="from-primary to-primary/70 grid size-9 cursor-pointer place-items-center rounded-full bg-gradient-to-br text-xs font-bold tracking-wide text-white"
	>
		{initials}
	</div>
	<div
		tabindex="-1"
		class="dropdown-content rounded-box bg-base-100 border-base-300 mt-3 w-64 border shadow-xl"
	>
		<a
			href={resolve('/my-account')}
			class="hover:bg-base-200 rounded-t-box group flex items-center gap-3 px-4 pt-4 pb-3 transition-colors"
		>
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				{#if displayName}
					<span class="leading-tight font-semibold">{displayName}</span>
				{/if}
				<span class="text-base-content/70 truncate text-xs">{user.email}</span>
				<span class="text-primary mt-1 text-xs font-medium group-hover:underline">
					{m.myAccount()}
				</span>
			</div>
			<i
				class="fa-solid fa-chevron-right text-base-content/40 group-hover:text-primary text-xs transition-all group-hover:translate-x-0.5"
				aria-hidden="true"
			></i>
		</a>
		<div class="divider my-0"></div>
		<ul class="menu w-full p-2">
			{#if configPublic.PUBLIC_FEEDBACK_URL}
				<li>
					<a href={configPublic.PUBLIC_FEEDBACK_URL} target="_blank" rel="external">
						<i class="fa-duotone fa-comment w-4"></i>
						{m.feedback()}
					</a>
				</li>
			{/if}
			<li>
				<a class={logoutUrl ? '' : 'disabled'} href={logoutUrl} rel="external">
					<i class="fa-duotone fa-sign-out w-4"></i>
					{m.logout()}
				</a>
			</li>
		</ul>
		<div class="divider my-0"></div>
		<div class="flex justify-center p-3">
			<LanguageSwitcher />
		</div>
	</div>
</div>
