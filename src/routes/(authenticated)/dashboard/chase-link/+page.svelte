<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import ChaseLinkStatus from './ChaseLinkStatus.svelte';

	/** The system-level link to a MUNify CHASE instance (`docs/plans/chase-link.md`). */
	const currentUser = await getCurrentUser();
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 max-sm:px-0 md:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{m.chaseLinkTitle()}</h1>
		<p class="text-base-content/70">{m.chaseLinkIntro()}</p>
	</header>
	{#if currentUser.isAdmin}
		<ChaseLinkStatus />
	{:else}
		<div class="alert alert-warning">{m.chaseLinkAdminsOnly()}</div>
	{/if}
</div>
