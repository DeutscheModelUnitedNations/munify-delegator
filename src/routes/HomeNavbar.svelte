<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import UserMenu from './(authenticated)/UserMenu.svelte';

	// Only whether a session exists; the menu fetches the person itself.
	const signedIn = !!(await client.query.offlineUserRefresh({ user: { sub: true } })).user;
</script>

<header
	class="enter-fade relative z-30 mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-7 md:px-12"
>
	<a class="text-xl leading-none" href={resolve('/')}>
		<span class="font-light">MUNify</span> <span class="font-bold">DELEGATOR</span>
	</a>
	<nav class="flex flex-wrap items-center gap-x-7 gap-y-3 text-[15px]">
		<a
			class="link link-hover hidden sm:inline"
			href="https://github.com/DeutscheModelUnitedNations/munify-delegator"
			target="_blank"
			rel="noopener noreferrer"
		>
			GitHub
		</a>
		<a class="btn btn-primary btn-sm" href={resolve('/dashboard')}>{m.homeConferencesBtn()}</a>
		{#if signedIn}
			<UserMenu />
		{/if}
	</nav>
</header>
