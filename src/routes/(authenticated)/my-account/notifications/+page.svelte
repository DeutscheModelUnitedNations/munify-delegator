<script lang="ts">
	import { dev } from '$app/env';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import NotificationAllButtons from './NotificationAllButtons.svelte';
	import NotificationConferenceGroup from './NotificationConferenceGroup.svelte';

	/**
	 * The caller's notification settings as one matrix: per conference they are on the team of (a
	 * row group, with whether Slack reaches them there), what mail and Slack tell them about, each
	 * with a test. A switch saves right away, as do the buttons switching a whole conference or
	 * everything; the list is live, so a function handed out or a workspace picked meanwhile shows up.
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
				roleName: true,
				email: true,
				slack: true
			}
		})
	);

	const allSettings = $derived(conferences.flatMap((conference) => conference.settings));
	let switching = $state(false);

	/** Switches everything of one conference, or of all of them, on or off. */
	async function setAll({ conferenceId, enabled }: { conferenceId?: string; enabled: boolean }) {
		switching = true;
		try {
			await client.mutate.setAllNotificationPreferences({ __args: { conferenceId, enabled } });
		} catch {
			toast.error(m.notificationSaveFailed());
		} finally {
			switching = false;
		}
	}
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

	{#if allSettings.length > 0}
		<div class="flex justify-end">
			<NotificationAllButtons
				settings={allSettings}
				enableLabel={m.notificationsEnableEverywhere()}
				disableLabel={m.notificationsDisableEverywhere()}
				busy={switching}
				onset={(enabled) => setAll({ enabled })}
			/>
		</div>
	{/if}

	{#if conferences.length > 0}
		<div class="bg-base-100 rounded-box border-base-300 overflow-x-auto border">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">{m.notificationsTopic()}</th>
						<th scope="col" class="w-28 text-center">{m.notificationsChannelEmail()}</th>
						<th scope="col" class="w-28 text-center">{m.notificationsChannelSlack()}</th>
					</tr>
				</thead>
				{#each conferences as conference (conference.conferenceId)}
					<NotificationConferenceGroup
						{conference}
						busy={switching}
						onsetall={(enabled) => setAll({ conferenceId: conference.conferenceId, enabled })}
					/>
				{/each}
			</table>
		</div>
	{/if}

	{#if allSettings.length > 0}
		<p class="text-base-content/70 text-xs">{m.notificationsTestNote()}</p>
	{/if}

	<p class="text-base-content/70 text-sm">{m.notificationsContentNote()}</p>
</div>
