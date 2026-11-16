<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import SlackWorkspaces from './SlackWorkspaces.svelte';

	/** The Slack workspaces the app can write into, kept by the system admins. */
	const currentUser = await getCurrentUser();
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 max-sm:px-0 md:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{m.slackWorkspaces()}</h1>
		<p class="text-base-content/70">{m.slackWorkspacesIntro()}</p>
	</header>
	{#if currentUser.isAdmin}
		<SlackWorkspaces />
	{:else}
		<div class="alert alert-warning">{m.slackWorkspacesAdminsOnly()}</div>
	{/if}
</div>
