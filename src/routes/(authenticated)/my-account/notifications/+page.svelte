<script lang="ts">
	import { dev } from '$app/env';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
	import type { NotificationTopic } from '#lib/helpers/teamNotifications';
	import NotificationChannelCell from './NotificationChannelCell.svelte';
	import SlackConnectionNote from './SlackConnectionNote.svelte';

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
				email: true,
				slack: true
			}
		})
	);

	const rowKey = (setting: { topic: string; teamFunctionId?: string | null }) =>
		`${setting.topic}:${setting.teamFunctionId ?? ''}`;
	const keyOf = (setting: { topic: NotificationTopic; teamFunctionId?: string | null }) => ({
		topic: setting.topic,
		teamFunctionId: setting.teamFunctionId ?? null
	});

	type Settings = (typeof conferences)[number]['settings'];

	/** Whether every switch of the settings is already where `enabled` would put it. */
	const allAre = ({ settings, enabled }: { settings: Settings; enabled: boolean }) =>
		settings.every((setting) => setting.email === enabled && setting.slack === enabled);

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

{#snippet allButtons({
	settings,
	conferenceId,
	enableLabel,
	disableLabel
}: {
	settings: Settings;
	conferenceId?: string;
	enableLabel: string;
	disableLabel: string;
})}
	<div class="join">
		<button
			type="button"
			class="btn btn-xs join-item"
			aria-label={enableLabel}
			disabled={switching || allAre({ settings, enabled: true })}
			onclick={() => setAll({ conferenceId, enabled: true })}
		>
			<i aria-hidden="true" class="ph-duotone ph-bell-ringing"></i>
			{m.notificationsEnableAll()}
		</button>
		<button
			type="button"
			class="btn btn-xs join-item"
			aria-label={disableLabel}
			disabled={switching || allAre({ settings, enabled: false })}
			onclick={() => setAll({ conferenceId, enabled: false })}
		>
			<i aria-hidden="true" class="ph-duotone ph-bell-slash"></i>
			{m.notificationsDisableAll()}
		</button>
	</div>
{/snippet}

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
			{@render allButtons({
				settings: allSettings,
				enableLabel: m.notificationsEnableEverywhere(),
				disableLabel: m.notificationsDisableEverywhere()
			})}
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
					<tbody data-testid="notifications-conference">
						<tr class="bg-base-200/60">
							<th colspan="3" scope="rowgroup" class="font-normal">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<span class="text-base-content text-base font-bold">
										{conference.conferenceTitle}
									</span>
									{#if conference.settings.length > 0}
										{@render allButtons({
											settings: conference.settings,
											conferenceId: conference.conferenceId,
											enableLabel: m.notificationsEnableAllOf({
												conference: conference.conferenceTitle
											}),
											disableLabel: m.notificationsDisableAllOf({
												conference: conference.conferenceTitle
											})
										})}
									{/if}
								</div>
								<svelte:boundary>
									<SlackConnectionNote
										conferenceId={conference.conferenceId}
										workspaceName={conference.slackWorkspaceName ?? null}
									/>
									{#snippet pending()}
										<div class="skeleton mt-1 h-4 w-2/3"></div>
									{/snippet}
								</svelte:boundary>
							</th>
						</tr>
						{#each conference.settings as setting (setting.id)}
							{@const label = notificationTopicLabel(setting)}
							<tr data-testid="notification-row" data-topic={rowKey(setting)}>
								<th scope="row" class="pl-8 font-normal">
									<span class="font-medium">{label}</span>
									{#if setting.committeeName}
										<span class="text-base-content/70 block text-xs">
											{setting.committeeName}
										</span>
									{/if}
								</th>
								<NotificationChannelCell
									conferenceId={conference.conferenceId}
									key={keyOf(setting)}
									channel="EMAIL"
									{label}
									checked={setting.email}
								/>
								<NotificationChannelCell
									conferenceId={conference.conferenceId}
									key={keyOf(setting)}
									channel="SLACK"
									{label}
									checked={setting.slack}
									testUnavailable={conference.slackWorkspaceName
										? undefined
										: m.notificationsTestNoWorkspace()}
								/>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="text-base-content/70 pl-8 text-sm">
									{m.notificationsNoTopics()}
								</td>
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
	{/if}

	{#if allSettings.length > 0}
		<p class="text-base-content/70 text-xs">{m.notificationsTestNote()}</p>
	{/if}

	<p class="text-base-content/70 text-sm">{m.notificationsContentNote()}</p>
</div>
