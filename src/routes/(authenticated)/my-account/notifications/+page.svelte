<script lang="ts">
	import { dev } from '$app/env';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import SlackConnectionNote from './SlackConnectionNote.svelte';
	import NotificationTable from './NotificationTable.svelte';

	/**
	 * The caller's notification settings: per conference they are on the team of, what mail and
	 * Slack tell them about. A switch saves right away; the list is live, so a function handed
	 * out or a workspace picked meanwhile shows up.
	 */

	const conferences = $derived(
		await client.liveQuery.myNotificationSettings({
			conferenceId: true,
			conferenceTitle: true,
			slackWorkspaceName: true,
			settings: {
				topic: true,
				teamFunctionId: true,
				functionKind: true,
				committeeAbbreviation: true,
				committeeName: true,
				email: true,
				slack: true
			}
		})
	);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.notifications()}</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 max-sm:px-0 md:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{m.notifications()}</h1>
		<p class="text-base-content/70">{m.notificationsIntro()}</p>
	</header>

	{#if conferences.length === 0}
		<div class="alert" data-testid="notifications-empty">
			<i aria-hidden="true" class="ph-duotone ph-bell-slash text-xl"></i>
			<span>{m.notificationsNoTeam()}</span>
		</div>
	{/if}

	{#each conferences as conference (conference.conferenceId)}
		<section
			class="bg-base-100 rounded-box border-base-300 flex flex-col gap-4 border p-4 sm:p-6"
			aria-labelledby="notifications-{conference.conferenceId}"
			data-testid="notifications-conference"
		>
			<h2 id="notifications-{conference.conferenceId}" class="text-xl font-bold">
				{conference.conferenceTitle}
			</h2>

			{#if conference.settings.length === 0}
				<p class="text-base-content/70 text-sm">{m.notificationsNoTopics()}</p>
			{:else}
				<NotificationTable
					conferenceId={conference.conferenceId}
					hasSlackWorkspace={Boolean(conference.slackWorkspaceName)}
					settings={conference.settings}
				/>
			{/if}

			<svelte:boundary>
				<SlackConnectionNote
					conferenceId={conference.conferenceId}
					workspaceName={conference.slackWorkspaceName ?? null}
				/>
				{#snippet pending()}
					<div class="skeleton h-12 w-full"></div>
				{/snippet}
			</svelte:boundary>
		</section>
	{/each}

	<p class="text-base-content/70 text-sm">{m.notificationsContentNote()}</p>
</div>
